import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { AdminReviewsController } from './admin-reviews.controller'
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto'
import { SellerReplyDto } from './dto/seller-reply.dto'
import { UpdateReviewStatusDto } from './dto/update-review-status.dto'
import { ReviewsService } from './reviews.service'

const mockService = {
  findAllForAdmin: jest.fn(),
  updateStatusForAdmin: jest.fn(),
  setSellerReply: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/reviews')
  await $allureSubSuite('admin-reviews.controller')
  await $allureSeverity('normal')
})

describe('AdminReviewsController', () => {
  let controller: AdminReviewsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockService }],
    }).compile()
    controller = module.get(AdminReviewsController)
    jest.clearAllMocks()
  })

  it('findAll() forwards the AdminReviewsQueryDto verbatim', async () => {
    const query: AdminReviewsQueryDto = { status: 'PENDING', rating: 5 }
    mockService.findAllForAdmin.mockResolvedValue({
      data: [],
      meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
    })

    await controller.findAll(query)

    expect(mockService.findAllForAdmin).toHaveBeenCalledWith(query)
  })

  it('updateStatus() passes (reviewId, dto) to updateStatusForAdmin', async () => {
    const dto: UpdateReviewStatusDto = { status: 'APPROVED' }
    mockService.updateStatusForAdmin.mockResolvedValue({ id: 'rev-1', status: 'APPROVED' })

    await controller.updateStatus('rev-1', dto)

    expect(mockService.updateStatusForAdmin).toHaveBeenCalledWith('rev-1', dto)
  })

  it('reply() passes (reviewId, sellerReplyDto) to setSellerReply', async () => {
    const dto: SellerReplyDto = { reply: 'Thanks!' }
    mockService.setSellerReply.mockResolvedValue({ id: 'rev-1', sellerReply: 'Thanks!' })

    await controller.reply('rev-1', dto)

    expect(mockService.setSellerReply).toHaveBeenCalledWith('rev-1', dto)
  })
})
