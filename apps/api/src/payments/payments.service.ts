import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async createPaymentIntent(orderId: string): Promise<{ clientSecret: string }> {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot create PaymentIntent for order with status ${order.status}`,
      )
    }

    if (order.payment) {
      // Return existing clientSecret instead of creating a duplicate PaymentIntent.
      // Handles the case where the browser reloads mid-checkout.
      const existingIntent = await this.stripeService.client.paymentIntents.retrieve(
        order.payment.stripeId,
      )

      if (!existingIntent.client_secret) {
        throw new ConflictException('Existing PaymentIntent has no client secret')
      }

      return { clientSecret: existingIntent.client_secret }
    }

    // Stripe requires amount in the smallest currency unit (cents for USD)
    const amountInCents = Math.round(Number(order.total) * 100)

    // orderId as idempotency key — prevents duplicate PaymentIntents on network retries
    const stripePaymentIntent = await this.stripeService.client.paymentIntents.create(
      {
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: ['card'],
        // Stored on the PaymentIntent for reconciliation in Stripe Dashboard
        metadata: { orderId },
      },
      { idempotencyKey: `create-intent-${orderId}` },
    )

    if (!stripePaymentIntent.client_secret) {
      throw new ConflictException('Stripe did not return a client secret')
    }

    await this.prismaService.payment.create({
      data: {
        orderId,
        stripeId: stripePaymentIntent.id,
        amount: order.total,
        status: 'PENDING',
      },
    })

    return { clientSecret: stripePaymentIntent.client_secret }
  }
}
