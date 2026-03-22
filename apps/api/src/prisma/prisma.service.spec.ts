import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from './prisma.service'

// jest.mock is hoisted to the top of the file before any variable declarations.
// The class must be defined inside the factory to avoid "Cannot access before initialization".
// A class mock (not a plain object) preserves the prototype chain so PrismaService methods
// like onModuleInit remain accessible on the instance.
jest.mock('@prisma/client', () => {
  class MockPrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined)
    $disconnect = jest.fn().mockResolvedValue(undefined)
  }
  return { PrismaClient: MockPrismaClient }
})

describe('PrismaService', () => {
  let prismaService: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()

    prismaService = module.get<PrismaService>(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('calls $connect when onModuleInit is invoked', async () => {
    await prismaService.onModuleInit()

    // $connect is a jest.fn() class field set by the mock — safe cast, no real type loss
    const connectMock = (prismaService as unknown as { $connect: jest.Mock }).$connect
    expect(connectMock).toHaveBeenCalledTimes(1)
  })

  it('calls $disconnect when onModuleDestroy is invoked', async () => {
    await prismaService.onModuleDestroy()

    const disconnectMock = (prismaService as unknown as { $disconnect: jest.Mock }).$disconnect
    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })
})
