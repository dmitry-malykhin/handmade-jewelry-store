import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Role } from '@prisma/client'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UsersService } from '../../users/users.service'

export interface JwtPayload {
  sub: string
  email: string
  role: Role
  // Session identifier — matches RefreshToken.id in DB.
  // Embedded in both access and refresh JWTs so logout can target a specific session.
  tokenId: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    // Attach tokenId so JwtAuthGuard-protected endpoints can perform session-scoped operations
    // (e.g. logout targets the specific RefreshToken row, not all sessions).
    return { ...user, tokenId: payload.tokenId }
  }
}
