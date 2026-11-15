jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_DAY_AT_3AM: '0 3 * * *' },
}))

import { Test, TestingModule } from '@nestjs/testing'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'
import { RetentionController } from './retention.controller'
import { DataRetentionService } from './retention.service'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/retention')
  await $allureSubSuite('retention.controller')
  await $allureSeverity('normal')
})

describe('RetentionController', () => {
  let retentionController: RetentionController
  let mockDataRetentionService: { runAll: jest.Mock }

  beforeEach(async () => {
    mockDataRetentionService = { runAll: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RetentionController],
      providers: [{ provide: DataRetentionService, useValue: mockDataRetentionService }],
    }).compile()

    retentionController = module.get(RetentionController)
  })

  it('POST /admin/retention/run delegates to DataRetentionService.runAll and returns the report', async () => {
    const report = {
      refreshTokensPurged: 5,
      passwordResetTokensCleared: 2,
      emailVerificationTokensCleared: 1,
    }
    mockDataRetentionService.runAll.mockResolvedValueOnce(report)

    const result = await retentionController.run()

    expect(mockDataRetentionService.runAll).toHaveBeenCalledTimes(1)
    expect(result).toBe(report)
  })
})
