import { Test, type TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { OrderStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { EASYPOST_CLIENT } from './easypost-client.token'
import type { EasyPostClient } from './easypost-client.interface'
import { ShippingService } from './shipping.service'

const completeAddress = {
  fullName: 'Maya Quinn',
  addressLine1: '742 Evergreen Terrace',
  city: 'Springfield',
  state: 'OR',
  postalCode: '97401',
  country: 'US',
}

function buildOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    status: OrderStatus.PAID,
    total: '125.50',
    shippingAddress: completeAddress,
    labelUrl: null,
    easypostTrackerId: null,
    items: [{ productSnapshot: { weightGrams: 42 }, quantity: 1 }],
    ...overrides,
  }
}

describe('ShippingService', () => {
  let shippingService: ShippingService
  let prismaService: {
    order: {
      findUnique: jest.Mock
      findFirst: jest.Mock
      update: jest.Mock
    }
  }
  let easypostClient: jest.Mocked<EasyPostClient>

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    }
    easypostClient = {
      isLiveMode: false,
      purchaseLabel: jest.fn(),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      parseTrackerEvent: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: prismaService },
        { provide: EASYPOST_CLIENT, useValue: easypostClient },
      ],
    }).compile()

    shippingService = module.get(ShippingService)
  })

  afterEach(() => jest.resetAllMocks())

  describe('getStatus', () => {
    it('exposes the mock client as non-live by default', () => {
      expect(shippingService.getStatus()).toEqual({ isLiveMode: false })
    })
  })

  describe('purchaseLabel', () => {
    it('throws NotFoundException when the order is missing', async () => {
      prismaService.order.findUnique.mockResolvedValue(null)

      await expect(
        shippingService.purchaseLabel({ orderId: 'missing', carrier: 'USPS' }),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rejects an order that is not yet PAID/PROCESSING', async () => {
      prismaService.order.findUnique.mockResolvedValue(buildOrder({ status: OrderStatus.PENDING }))

      await expect(
        shippingService.purchaseLabel({ orderId: 'order-1', carrier: 'USPS' }),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejects a second label purchase on the same order', async () => {
      prismaService.order.findUnique.mockResolvedValue(
        buildOrder({ labelUrl: 'https://example.test/already.pdf' }),
      )

      await expect(
        shippingService.purchaseLabel({ orderId: 'order-1', carrier: 'USPS' }),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejects insurance higher than the order total', async () => {
      prismaService.order.findUnique.mockResolvedValue(buildOrder())
      // order total = $125.50 = 12550c
      await expect(
        shippingService.purchaseLabel({
          orderId: 'order-1',
          carrier: 'USPS',
          insuranceCents: 20000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejects orders with an incomplete shipping address', async () => {
      prismaService.order.findUnique.mockResolvedValue(
        buildOrder({ shippingAddress: { ...completeAddress, city: undefined } }),
      )

      await expect(
        shippingService.purchaseLabel({ orderId: 'order-1', carrier: 'USPS' }),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('purchases a label and persists tracker/label/insurance fields', async () => {
      const orderRow = buildOrder()
      prismaService.order.findUnique.mockResolvedValue(orderRow)
      const estimatedDeliveryAt = new Date('2026-06-05T00:00:00Z')
      easypostClient.purchaseLabel.mockResolvedValue({
        shipmentId: 'shp_abc',
        trackerId: 'trk_abc',
        trackingNumber: 'TRK123',
        labelUrl: 'https://example.test/abc.pdf',
        estimatedDeliveryAt,
      })

      const outcome = await shippingService.purchaseLabel({
        orderId: 'order-1',
        carrier: 'USPS',
        insuranceCents: 5000,
      })

      expect(easypostClient.purchaseLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          carrier: 'USPS',
          insuranceCents: 5000,
          toAddress: expect.objectContaining({
            name: 'Maya Quinn',
            street1: '742 Evergreen Terrace',
            zip: '97401',
            country: 'US',
          }),
        }),
      )

      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          easypostShipmentId: 'shp_abc',
          easypostTrackerId: 'trk_abc',
          labelUrl: 'https://example.test/abc.pdf',
          trackingNumber: 'TRK123',
          shippingCarrier: 'USPS',
          estimatedDeliveryAt,
          shippingInsuranceCents: 5000,
        }),
      })

      expect(outcome).toMatchObject({
        trackingNumber: 'TRK123',
        labelUrl: 'https://example.test/abc.pdf',
        carrier: 'USPS',
        insuranceCents: 5000,
        isLiveMode: false,
      })
    })

    it('uses zero insurance when the field is omitted', async () => {
      prismaService.order.findUnique.mockResolvedValue(buildOrder())
      easypostClient.purchaseLabel.mockResolvedValue({
        shipmentId: 'shp_x',
        trackerId: 'trk_x',
        trackingNumber: 'TRKX',
        labelUrl: 'https://example.test/x.pdf',
        estimatedDeliveryAt: null,
      })

      const outcome = await shippingService.purchaseLabel({ orderId: 'order-1', carrier: 'UPS' })

      expect(easypostClient.purchaseLabel).toHaveBeenCalledWith(
        expect.objectContaining({ insuranceCents: 0 }),
      )
      expect(outcome.insuranceCents).toBe(0)
    })
  })

  describe('handleWebhook', () => {
    it('rejects payloads that fail the signature check', async () => {
      easypostClient.verifyWebhookSignature.mockReturnValue(false)

      await expect(shippingService.handleWebhook('{}', 'bad-sig')).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('rejects malformed JSON bodies', async () => {
      await expect(shippingService.handleWebhook('not-json', 'sig')).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('returns processed:false for non-tracker events', async () => {
      easypostClient.parseTrackerEvent.mockReturnValue(null)

      await expect(shippingService.handleWebhook('{}', 'sig')).resolves.toEqual({
        processed: false,
      })
    })

    it('ignores non-delivered tracker statuses', async () => {
      easypostClient.parseTrackerEvent.mockReturnValue({
        trackerId: 'trk_1',
        status: 'in_transit',
        carrier: 'USPS',
        trackingNumber: 'TRK1',
      })

      await expect(shippingService.handleWebhook('{}', 'sig')).resolves.toEqual({
        processed: false,
      })
      expect(prismaService.order.update).not.toHaveBeenCalled()
    })

    it('ignores when no order matches the trackerId', async () => {
      easypostClient.parseTrackerEvent.mockReturnValue({
        trackerId: 'trk_unknown',
        status: 'delivered',
        carrier: 'USPS',
        trackingNumber: 'TRKU',
      })
      prismaService.order.findFirst.mockResolvedValue(null)

      await expect(shippingService.handleWebhook('{}', 'sig')).resolves.toEqual({
        processed: false,
      })
      expect(prismaService.order.update).not.toHaveBeenCalled()
    })

    it('ignores duplicate deliveries on an already-DELIVERED order', async () => {
      easypostClient.parseTrackerEvent.mockReturnValue({
        trackerId: 'trk_dup',
        status: 'delivered',
        carrier: 'USPS',
        trackingNumber: 'TRKD',
      })
      prismaService.order.findFirst.mockResolvedValue({
        id: 'order-dup',
        status: OrderStatus.DELIVERED,
      })

      await expect(shippingService.handleWebhook('{}', 'sig')).resolves.toEqual({
        processed: false,
      })
      expect(prismaService.order.update).not.toHaveBeenCalled()
    })

    it('transitions a SHIPPED order to DELIVERED and writes status history', async () => {
      easypostClient.parseTrackerEvent.mockReturnValue({
        trackerId: 'trk_ok',
        status: 'delivered',
        carrier: 'USPS',
        trackingNumber: 'TRKK',
      })
      prismaService.order.findFirst.mockResolvedValue({
        id: 'order-ok',
        status: OrderStatus.SHIPPED,
      })

      await expect(shippingService.handleWebhook('{}', 'sig')).resolves.toEqual({
        processed: true,
        deliveredOrderId: 'order-ok',
      })
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-ok' },
        data: expect.objectContaining({
          status: OrderStatus.DELIVERED,
          deliveredAt: expect.any(Date),
          statusHistory: expect.objectContaining({
            create: expect.objectContaining({
              toStatus: OrderStatus.DELIVERED,
              createdBy: 'system',
            }),
          }),
        }),
      })
    })

    it('refuses an illegal state-machine transition (e.g. PAID → DELIVERED)', async () => {
      easypostClient.parseTrackerEvent.mockReturnValue({
        trackerId: 'trk_paid',
        status: 'delivered',
        carrier: 'USPS',
        trackingNumber: 'TRKP',
      })
      prismaService.order.findFirst.mockResolvedValue({
        id: 'order-paid',
        status: OrderStatus.PAID,
      })

      await expect(shippingService.handleWebhook('{}', 'sig')).resolves.toEqual({
        processed: false,
      })
      expect(prismaService.order.update).not.toHaveBeenCalled()
    })
  })
})
