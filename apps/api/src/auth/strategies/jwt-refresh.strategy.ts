import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import type { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UsersService } from '../../users/users.service'
import type { JwtPayload } from './jwt.strategy'

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string // raw token for bcrypt.compare against stored hash
}

// Cookie preferred (HttpOnly — XSS cannot read); Authorization header is legacy
// fallback for old clients still on localStorage during rollout.
function extractRefreshToken(request: Request): string | null {
  const cookieToken = (request as unknown as { cookies?: Record<string, string> }).cookies
    ?.refreshToken
  if (cookieToken) return cookieToken
  const authHeader = request.headers.authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      // Pin HS256 — blocks alg=none + HS/RS confusion (CVE-2015-9235 class).
      algorithms: ['HS256'],
      // passReqToCallback allows extracting the raw token from the request
      // so AuthService can verify it against the stored hash
      passReqToCallback: true,
    })
  }

  async validate(request: Request, payload: JwtPayload): Promise<JwtRefreshPayload> {
    const rawRefreshToken = extractRefreshToken(request) ?? ''

    // Lightweight guard: reject tokens that pre-date the RefreshToken table (no tokenId).
    // Full validation (hash comparison, expiry) happens in AuthService.refreshTokens.
    if (!payload.tokenId) {
      throw new UnauthorizedException('Refresh token invalid or revoked')
    }

    return { ...payload, refreshToken: rawRefreshToken }
  }
}
