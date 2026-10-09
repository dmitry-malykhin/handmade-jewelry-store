import type { JwtService } from '@nestjs/jwt'

const ORDER_ACCESS_TOKEN_TTL = '30d'

export function issueOrderAccessToken(jwtService: JwtService, orderId: string): string {
  return jwtService.sign(
    { orderId, purpose: 'order-access' as const },
    { expiresIn: ORDER_ACCESS_TOKEN_TTL },
  )
}
