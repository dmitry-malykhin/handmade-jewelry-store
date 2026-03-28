import { ConflictException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { User } from '@prisma/client'
import { UsersService } from '../users/users.service'
import type { JwtPayload } from './strategies/jwt.strategy'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserCredentials(email: string, plainPassword: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email)
    if (!user) return null

    const passwordMatches = await this.usersService.verifyPassword(plainPassword, user.password)
    if (!passwordMatches) return null

    return user
  }

  async register(email: string, plainPassword: string): Promise<{ accessToken: string }> {
    const existingUser = await this.usersService.findByEmail(email)
    if (existingUser) {
      throw new ConflictException('An account with this email already exists')
    }

    const newUser = await this.usersService.createUser(email, plainPassword)
    return { accessToken: this.signToken(newUser) }
  }

  login(user: User): { accessToken: string } {
    return { accessToken: this.signToken(user) }
  }

  private signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    return this.jwtService.sign(payload)
  }
}
