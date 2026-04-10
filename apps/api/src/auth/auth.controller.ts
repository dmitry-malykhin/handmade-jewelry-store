import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import type { User } from '@prisma/client'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthService } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { LocalAuthGuard } from './guards/local-auth.guard'
import type { JwtRefreshPayload } from './strategies/jwt-refresh.strategy'
import type { JwtPayload } from './strategies/jwt.strategy'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto.email, registerDto.password)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  login(
    @CurrentUser() user: User,
    // LoginDto is declared here for Swagger documentation — actual validation is done by LocalAuthGuard
    @Body() _loginDto: LoginDto,
  ) {
    return this.authService.login(user)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  refresh(@CurrentUser() payload: JwtRefreshPayload) {
    return this.authService.refreshTokens(payload.sub, payload.tokenId, payload.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: User & Pick<JwtPayload, 'tokenId'>) {
    return this.authService.logout(user.id, user.tokenId)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    const { password: _, ...safeUser } = user
    return safeUser
  }
}
