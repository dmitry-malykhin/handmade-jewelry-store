import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { AuthService } from '../auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    // passport-local expects "username" by default — override to use "email"
    super({ usernameField: 'email' })
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUserCredentials(email, password)
    if (!user) {
      throw new UnauthorizedException('Invalid email or password')
    }
    return user
  }
}
