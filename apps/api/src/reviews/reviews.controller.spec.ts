import { Test, TestingModule } from '@nestjs/testing'
import type { User } from '@prisma/client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { CreateReviewDto } from './dto/create-review.dto'
import { ReviewQueryDto } from './dto/review-query.dto'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'

const mockService = {
  createReview: jest.fn(),
  findReviewsForProduct: jest.fn(),
  findUserReviewForProduct: jest.fn(),
  checkReviewEligibility: jest.fn(),
}

const mockUser = { id: 'u1' } as User

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/reviews')
  await $allureSubSuite('reviews.controller')
  await $allureSeverity('normal')
})

describe('ReviewsController', () => {
  let controller: ReviewsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockService }],
    }).compile()
    controller = module.get(ReviewsController)
    jest.clearAllMocks()
  })

  it('create() passes (currentUser.id, dto) to ReviewsService.createReview', async () => {
    const dto: CreateReviewDto = { productId: 'p1', rating: 5, comment: 'Great' }
    mockService.createReview.mockResolvedValue({ id: 'rev-1' })

    await controller.create(mockUser, dto)

    expect(mockService.createReview).toHaveBeenCalledWith('u1', dto)
  })

  it('list() passes (slug, query) to findReviewsForProduct', async () => {
    const query: ReviewQueryDto = { page: 1, limit: 10 }
    mockService.findReviewsForProduct.mockResolvedValue({ data: [], meta: { totalCount: 0 } })

    await controller.list('silver-ring', query)

    expect(mockService.findReviewsForProduct).toHaveBeenCalledWith('silver-ring', query)
  })

  it('findMine() passes (currentUser.id, productId) to the service', async () => {
    mockService.findUserReviewForProduct.mockResolvedValue(null)

    await controller.findMine(mockUser, 'p1')

    expect(mockService.findUserReviewForProduct).toHaveBeenCalledWith('u1', 'p1')
  })

  it('checkEligibility() returns the service eligibility verdict', async () => {
    mockService.checkReviewEligibility.mockResolvedValue({
      hasPurchased: true,
      hasReviewed: false,
      canReview: true,
    })

    const result = await controller.checkEligibility(mockUser, 'p1')

    expect(mockService.checkReviewEligibility).toHaveBeenCalledWith('u1', 'p1')
    expect(result.canReview).toBe(true)
  })
})
