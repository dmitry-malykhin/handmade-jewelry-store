import { Logger } from '@nestjs/common'
import { EasypostMockClient } from './easypost-mock.client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/shipping')
  await $allureSubSuite('easypost-mock.client')
  await $allureSeverity('normal')
})

describe('EasypostMockClient', () => {
  let easypostMockClient: EasypostMockClient

  beforeEach(() => {
    easypostMockClient = new EasypostMockClient()
  })

  describe('isLiveMode', () => {
    it('reports the client as dry-run', () => {
      expect(easypostMockClient.isLiveMode).toBe(false)
    })
  })

  describe('purchaseLabel', () => {
    it('returns deterministic mock ids derived from the orderId', async () => {
      const result = await easypostMockClient.purchaseLabel({
        orderId: 'cuid-abc12345',
        carrier: 'USPS',
        toAddress: {
          name: 'Test User',
          street1: '1 Test Way',
          city: 'Testville',
          state: 'OR',
          zip: '97401',
          country: 'US',
        },
        parcel: { weightOunces: 1 },
        insuranceCents: 0,
      })

      expect(result.shipmentId).toBe('shp_mock_cuidabc1')
      expect(result.trackerId).toBe('trk_mock_cuidabc1')
      expect(result.trackingNumber).toBe('MOCKCUIDABC1')
      expect(result.labelUrl).toContain('example.test')
      expect(result.estimatedDeliveryAt).toBeInstanceOf(Date)
    })

    // #281 — last-line-of-defence visibility for prod calls against the mock
    describe('production warning', () => {
      const ORIGINAL_NODE_ENV = process.env.NODE_ENV

      afterEach(() => {
        if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV
        else process.env.NODE_ENV = ORIGINAL_NODE_ENV
      })

      async function callPurchaseLabel() {
        await easypostMockClient.purchaseLabel({
          orderId: 'order-x',
          carrier: 'USPS',
          toAddress: {
            name: 'Test User',
            street1: '1 Test Way',
            city: 'Testville',
            state: 'OR',
            zip: '97401',
            country: 'US',
          },
          parcel: { weightOunces: 1 },
          insuranceCents: 0,
        })
      }

      it('does NOT emit a WARN log when NODE_ENV is not "production"', async () => {
        process.env.NODE_ENV = 'development'
        const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})

        await callPurchaseLabel()

        expect(warnSpy).not.toHaveBeenCalled()
        warnSpy.mockRestore()
      })

      it('emits a WARN log when NODE_ENV === "production" (regression: #281)', async () => {
        process.env.NODE_ENV = 'production'
        const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})

        await callPurchaseLabel()

        expect(warnSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy.mock.calls[0]?.[0]).toMatch(/mock-in-production/)
        expect(warnSpy.mock.calls[0]?.[0]).toMatch(/order-x/)
        warnSpy.mockRestore()
      })
    })
  })

  describe('verifyWebhookSignature', () => {
    it('accepts any signature in dry-run mode', () => {
      expect(easypostMockClient.verifyWebhookSignature()).toBe(true)
    })
  })

  describe('parseTrackerEvent', () => {
    it('returns null for non-object payloads', () => {
      expect(easypostMockClient.parseTrackerEvent(null)).toBeNull()
      expect(easypostMockClient.parseTrackerEvent('string')).toBeNull()
      expect(easypostMockClient.parseTrackerEvent([])).toBeNull()
    })

    it('returns null for non-tracker events', () => {
      expect(
        easypostMockClient.parseTrackerEvent({
          description: 'shipment.purchased',
          result: { id: 'shp_x', status: 'created' },
        }),
      ).toBeNull()
    })

    it('returns null when the result object is missing required fields', () => {
      expect(
        easypostMockClient.parseTrackerEvent({
          description: 'tracker.updated',
          result: { id: 'trk_x', status: 'in_transit' /* missing carrier + tracking_code */ },
        }),
      ).toBeNull()
    })

    it('rejects unknown statuses', () => {
      expect(
        easypostMockClient.parseTrackerEvent({
          description: 'tracker.updated',
          result: {
            id: 'trk_x',
            status: 'lost_in_space',
            carrier: 'USPS',
            tracking_code: 'TRK1',
          },
        }),
      ).toBeNull()
    })

    it('parses a canonical tracker.updated payload into a normalised event', () => {
      const event = easypostMockClient.parseTrackerEvent({
        description: 'tracker.updated',
        result: {
          id: 'trk_real_1',
          status: 'delivered',
          carrier: 'USPS',
          tracking_code: '9400111899223481750000',
        },
      })

      expect(event).toEqual({
        trackerId: 'trk_real_1',
        status: 'delivered',
        carrier: 'USPS',
        trackingNumber: '9400111899223481750000',
      })
    })
  })
})
