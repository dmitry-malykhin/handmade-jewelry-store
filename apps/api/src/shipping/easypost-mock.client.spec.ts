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
