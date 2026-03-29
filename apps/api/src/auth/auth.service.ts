import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { User } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import type { JwtPayload } from './strategies/jwt.strategy'

const REFRESH_TOKEN_HASH_ROUNDS = 10
// 7 days in seconds — number type is always accepted by JwtSignOptions.expiresIn
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60

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
    return this.generateTokens(newUser)
  }

  async login(user: User): Promise<AuthTokens> {
    return this.generateTokens(user)
  }

  async refreshTokens(userId: string, incomingRefreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId)
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Refresh token invalid or revoked')
    }

    const refreshTokenMatches = await bcrypt.compare(incomingRefreshToken, user.refreshToken)
    if (!refreshTokenMatches) {
      // Token reuse detected — revoke all sessions for this user
      await this.usersService.clearRefreshToken(userId)
      throw new UnauthorizedException('Refresh token reuse detected — please log in again')
    }

    return this.generateTokens(user)
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshToken(userId)
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      }),
    ])

    const hashedRefreshToken = await bcrypt.hash(refreshToken, REFRESH_TOKEN_HASH_ROUNDS)
    await this.usersService.saveRefreshToken(user.id, hashedRefreshToken)

    return { accessToken, refreshToken }
  }
}
