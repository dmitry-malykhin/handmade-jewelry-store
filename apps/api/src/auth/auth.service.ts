import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { User } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import type { JwtPayload } from './strategies/jwt.strategy'

const REFRESH_TOKEN_HASH_ROUNDS = 10
// 7 days in seconds — number type is always accepted by JwtSignOptions.expiresIn
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60
const PASSWORD_RESET_TOKEN_HASH_ROUNDS = 10
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly prismaService: PrismaService,
  ) {}

  async validateUserCredentials(email: string, plainPassword: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.usersService.findByEmail(normalizedEmail)
    if (!user) return null

    const passwordMatches = await this.usersService.verifyPassword(plainPassword, user.password)
    if (!passwordMatches) return null

    return user
  }

  async register(email: string, plainPassword: string): Promise<AuthTokens> {
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await this.usersService.findByEmail(normalizedEmail)
    if (existingUser) {
      throw new ConflictException('An account with this email already exists')
    }

    const newUser = await this.usersService.createUser(normalizedEmail, plainPassword)
    // Fire-and-forget — welcome email must not block or fail registration
    void this.emailService.sendWelcome({ recipientEmail: newUser.email })
    return this.generateTokens(newUser)
  }

  async login(user: User): Promise<AuthTokens> {
    return this.generateTokens(user)
  }

  async refreshTokens(
    userId: string,
    tokenId: string,
    incomingRefreshToken: string,
  ): Promise<AuthTokens> {
    const storedToken = await this.prismaService.refreshToken.findUnique({
      where: { id: tokenId },
    })

    // Reject if token doesn't exist or belongs to a different user
    if (!storedToken || storedToken.userId !== userId) {
      throw new UnauthorizedException('Refresh token invalid or revoked')
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prismaService.refreshToken.delete({ where: { id: tokenId } })
      throw new UnauthorizedException('Refresh token expired')
    }

    const tokenMatches = await bcrypt.compare(incomingRefreshToken, storedToken.tokenHash)
    if (!tokenMatches) {
      // Token reuse detected — someone presented a valid-looking but stale token.
      // Revoke ALL sessions for this user as a precaution.
      await this.revokeAllRefreshTokens(userId)
      throw new UnauthorizedException('Refresh token reuse detected — please log in again')
    }

    // Rotate: delete current session, issue a new one
    await this.prismaService.refreshToken.delete({ where: { id: tokenId } })

    const user = await this.usersService.findById(userId)
    if (!user) throw new UnauthorizedException('User not found')

    return this.generateTokens(user)
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.usersService.findByEmail(normalizedEmail)
    // Always return void — never reveal whether an email is registered
    if (!user) return

    const plainToken = crypto.randomUUID()
    const hashedToken = await bcrypt.hash(plainToken, PASSWORD_RESET_TOKEN_HASH_ROUNDS)

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashedToken, passwordResetTokenAt: new Date() },
    })

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001'
    // Fire-and-forget — email failure must not expose error details to the caller
    void this.emailService.sendPasswordReset({
      recipientEmail: normalizedEmail,
      resetToken: plainToken,
      frontendUrl,
    })
  }

  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    const expiryThreshold = new Date(Date.now() - PASSWORD_RESET_TOKEN_EXPIRY_MS)

    // Fetch all users with a non-expired reset token and compare via bcrypt
    const candidates = await this.prismaService.user.findMany({
      where: {
        passwordResetToken: { not: null },
        passwordResetTokenAt: { gte: expiryThreshold },
      },
    })

    let matchedUserId: string | null = null
    for (const candidate of candidates) {
      if (!candidate.passwordResetToken) continue
      // Sequential bcrypt comparisons are intentional — parallelising would negate constant-time protection
      const tokenMatches = await bcrypt.compare(plainToken, candidate.passwordResetToken)
      if (tokenMatches) {
        matchedUserId = candidate.id
        break
      }
    }

    if (!matchedUserId) {
      throw new BadRequestException('Invalid or expired password reset token')
    }

    const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_RESET_TOKEN_HASH_ROUNDS)

    // Atomic: update password + clear reset token + revoke all active sessions
    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: matchedUserId },
        data: { password: hashedPassword, passwordResetToken: null, passwordResetTokenAt: null },
      }),
      this.prismaService.refreshToken.deleteMany({ where: { userId: matchedUserId } }),
    ])
  }

  async logout(userId: string, tokenId: string): Promise<void> {
    // Delete only this session — other devices remain logged in
    await this.prismaService.refreshToken.deleteMany({
      where: { id: tokenId, userId },
    })
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prismaService.refreshToken.deleteMany({ where: { userId } })
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET')
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000)

    // Pre-generate tokenId so it can be embedded in both tokens simultaneously.
    // The same ID is stored as RefreshToken.id — enables O(1) session lookup.
    const tokenId = crypto.randomUUID()

    const basePayload: JwtPayload = { sub: user.id, email: user.email, role: user.role, tokenId }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(basePayload),
      this.jwtService.signAsync(basePayload, {
        secret: refreshSecret,
        expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      }),
    ])

    const tokenHash = await bcrypt.hash(refreshToken, REFRESH_TOKEN_HASH_ROUNDS)

    await this.prismaService.refreshToken.create({
      data: { id: tokenId, tokenHash, userId: user.id, expiresAt },
    })

    return { accessToken, refreshToken }
  }
}
