import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

// Attaches req.user when the request carries a valid JWT, returns null
// otherwise. Never throws — used on endpoints that serve both guests and
// authenticated users (e.g. POST /orders).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser | false): TUser | null {
    return user || null
  }
}
