import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { User } from '@prisma/client'
import type { Response } from 'express'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthService, type AuthTokens } from './auth.service'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { LocalAuthGuard } from './guards/local-auth.guard'
import type { JwtRefreshPayload } from './strategies/jwt-refresh.strategy'
import type { JwtPayload } from './strategies/jwt.strategy'

const REFRESH_COOKIE_NAME = 'refreshToken'
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// HttpOnly + Secure + SameSite=Lax + narrow Path — XSS cannot read this cookie
// from JS. Lax lets Stripe-return-URL navigation still carry it back.
function setRefreshCookie(response: Response, refreshToken: string): void {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  })
}

function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' })
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.authService.register(registerDto.email, registerDto.password)
    setRefreshCookie(response, tokens.refreshToken)
    return tokens
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  async login(
    @CurrentUser() user: User,
    // LoginDto is declared here for Swagger documentation — actual validation is done by LocalAuthGuard
    @Body() _loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.authService.login(user)
    setRefreshCookie(response, tokens.refreshToken)
    return tokens
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @CurrentUser() payload: JwtRefreshPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.authService.refreshTokens(
      payload.sub,
      payload.tokenId,
      payload.refreshToken,
    )
    setRefreshCookie(response, tokens.refreshToken)
    return tokens
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: User & Pick<JwtPayload, 'tokenId'>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(user.id, user.tokenId)
    clearRefreshCookie(response)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword)
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    )
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    const {
      password: _p,
      passwordResetToken: _prt,
      passwordResetTokenAt: _prtAt,
      ...safeUser
    } = user
    return safeUser
  }
}
