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
      // Reuse the existing clientSecret — handles mid-checkout browser reload.
      const existingIntent = await this.stripeService.client.paymentIntents.retrieve(
        order.payment.stripeId,
      )

      if (!existingIntent.client_secret) {
        throw new ConflictException('Existing PaymentIntent has no client secret')
      }

      return { clientSecret: existingIntent.client_secret }
    }

    const amountInCents = Math.round(Number(order.total) * 100)

    // Enable BNPL alongside cards. Stripe filters server-side by region /
    // currency / amount eligibility; both must also be enabled in the
    // Stripe Dashboard — see docs/runbooks/stripe-bnpl-setup.md.
    // 'afterpay_clearpay' covers both Afterpay (US/AU/NZ/CA) and Clearpay (UK).
    const paymentMethodTypes = ['card', 'klarna', 'afterpay_clearpay']

    const stripePaymentIntent = await this.stripeService.client.paymentIntents.create(
      {
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: paymentMethodTypes,
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
