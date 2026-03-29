import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UsersService } from '../../users/users.service'
import type { JwtPayload } from './jwt.strategy'

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      // passReqToCallback allows extracting the raw token from the request
      // so AuthService can verify it against the stored hash
      passReqToCallback: true,
    })
  }

  async validate(
    request: { headers: { authorization?: string } },
    payload: JwtPayload,
  ): Promise<JwtRefreshPayload> {
    const rawRefreshToken = request.headers.authorization?.replace('Bearer ', '') ?? ''

    const user = await this.usersService.findById(payload.sub)
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Refresh token invalid or revoked')
    }

    return { ...payload, refreshToken: rawRefreshToken }
  }
}
