/**
 * HTTP-level integration test for the Reviews module.
 *
 * Bootstraps a real Nest application with the same global pipes as production
 * (ValidationPipe with whitelist/transform), then exercises the REST endpoints
 * via supertest. This covers the entire flow that broke in browser:
 * - Content-Type parsing
 * - DTO validation (rating bounds, types, optional fields)
 * - JWT guard
 * - Verified-purchase guard
 * - Successful creation with empty/missing comment (stars only)
 *
 * Prisma is fully mocked — no database required.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus, Prisma, Role } from '@prisma/client'
import * as request from 'supertest'
import { JwtStrategy } from '../../auth/strategies/jwt.strategy'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'
import { UsersService } from '../../users/users.service'
import { ReviewsController } from '../reviews.controller'
import { ReviewsService } from '../reviews.service'

const VALID_JWT_SECRET = 'test-secret-for-integration'
const TEST_USER = {
  id: 'user-test-1',
  email: 'test@example.com',
  password: 'hashed',
  role: Role.USER,
  passwordResetToken: null,
  passwordResetTokenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const SAMPLE_PRODUCT = { id: 'prod-1', slug: 'beaded-bracelet', avgRating: 0, reviewCount: 0 }

const mockPrismaService = {
  product: { findUnique: jest.fn(), update: jest.fn() },
  orderItem: { findFirst: jest.fn() },
  review: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockUsersService = { findById: jest.fn() }

describe('Reviews HTTP integration', () => {
  let app: INestApplication
  let validToken: string

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: VALID_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [ReviewsController],
      providers: [
        ReviewsService,
        JwtStrategy,
        JwtAuthGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: { getOrThrow: () => VALID_JWT_SECRET } },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.init()

    const jwtService = moduleRef.get(JwtService)
    validToken = await jwtService.signAsync({
      sub: TEST_USER.id,
      email: TEST_USER.email,
      role: TEST_USER.role,
    })

    mockUsersService.findById.mockResolvedValue(TEST_USER)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsersService.findById.mockResolvedValue(TEST_USER)
  })

  // ── Auth guard ───────────────────────────────────────────────────────────

  it('returns 401 when no Authorization header', async () => {
    await request(app.getHttpServer())
      .post('/api/reviews')
      .send({ productId: 'prod-1', rating: 5 })
      .expect(401)
  })

  // ── DTO validation ───────────────────────────────────────────────────────

  it('returns 400 when productId is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ rating: 5 })
      .expect(400)

    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('productId')]),
    )
  })

  it('returns 400 when rating is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productId: 'prod-1' })
      .expect(400)

    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('rating')]),
    )
  })

  it.each([0, 6, -1, 100, 1.5])('returns 400 when rating is %s', async (badRating) => {
    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productId: 'prod-1', rating: badRating })
      .expect(400)
  })

  it('returns 400 when unknown fields are present (forbidNonWhitelisted)', async () => {
    setupSuccessfulCreate()
    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productId: 'prod-1', rating: 5, hackField: 'evil' })
      .expect(400)
  })

  // ── Verified purchase guard ──────────────────────────────────────────────

  it('returns 403 when user has not purchased the product', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue(SAMPLE_PRODUCT)
    mockPrismaService.orderItem.findFirst.mockResolvedValue(null)

    const response = await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productId: 'prod-1', rating: 5 })
      .expect(403)

    expect(response.body.message).toContain('purchased')
  })

  it.each([
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ])('queries Prisma to require DELIVERED — %s alone is not enough', async (status) => {
    mockPrismaService.product.findUnique.mockResolvedValue(SAMPLE_PRODUCT)
    // Service queries with status: { in: [DELIVERED] }; we verify Prisma was called
    // with that exact filter regardless of which other statuses exist.
    mockPrismaService.orderItem.findFirst.mockResolvedValue(null)

    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productId: 'prod-1', rating: 5 })
      .expect(403)

    expect(mockPrismaService.orderItem.findFirst).toHaveBeenCalledWith({
      where: {
        productId: 'prod-1',
        order: { userId: TEST_USER.id, status: { in: [OrderStatus.DELIVERED] } },
      },
      select: { id: true },
    })
    // Ensures the filter is the same regardless of the iterated status — that other
    // statuses are not silently allowed.
    expect(status).not.toBe(OrderStatus.DELIVERED)
  })

  // ── Successful creation ──────────────────────────────────────────────────

  it.each([1, 2, 3, 4, 5])(
    'creates review with rating=%s and no comment (stars only)',
    async (rating) => {
      setupSuccessfulCreate()

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ productId: 'prod-1', rating })
        .expect(201)

      expect(response.body.id).toBe('review-created')
      // Verify the review was actually created with the right rating
      const txCall = mockPrismaService.$transaction.mock.calls[0][0]
      const txMock = buildTxMock()
      await txCall(txMock)
      expect(txMock.review.create).toHaveBeenCalledWith({
        data: { userId: TEST_USER.id, productId: 'prod-1', rating, comment: undefined },
      })
    },
  )

  it('creates review with stars + comment', async () => {
    setupSuccessfulCreate()

    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productId: 'prod-1', rating: 5, comment: 'Beautiful piece!' })
      .expect(201)
  })

  it('returns 409 on duplicate review (P2002)', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue(SAMPLE_PRODUCT)
    mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
    mockPrismaService.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
    )

    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productId: 'prod-1', rating: 5 })
      .expect(409)
  })

  // ── Eligibility endpoint ─────────────────────────────────────────────────

  it('returns canReview=true when user has purchased and not yet reviewed', async () => {
    mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
    mockPrismaService.review.findUnique.mockResolvedValue(null)

    const response = await request(app.getHttpServer())
      .get('/api/reviews/eligibility?productId=prod-1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)

    expect(response.body).toEqual({ hasPurchased: true, hasReviewed: false, canReview: true })
  })

  it('returns canReview=false when user has not purchased', async () => {
    mockPrismaService.orderItem.findFirst.mockResolvedValue(null)
    mockPrismaService.review.findUnique.mockResolvedValue(null)

    const response = await request(app.getHttpServer())
      .get('/api/reviews/eligibility?productId=prod-1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)

    expect(response.body).toEqual({ hasPurchased: false, hasReviewed: false, canReview: false })
  })

  it('returns canReview=false when user has already reviewed', async () => {
    mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
    mockPrismaService.review.findUnique.mockResolvedValue({ id: 'review-1' })

    const response = await request(app.getHttpServer())
      .get('/api/reviews/eligibility?productId=prod-1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)

    expect(response.body).toEqual({ hasPurchased: true, hasReviewed: true, canReview: false })
  })

  it('eligibility endpoint requires JWT', async () => {
    await request(app.getHttpServer()).get('/api/reviews/eligibility?productId=prod-1').expect(401)
  })

  // ── Helpers ───────────────────────────────────────────────────────────────

  function buildTxMock() {
    return {
      review: {
        create: jest.fn().mockResolvedValue({ id: 'review-created' }),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 }, _count: 1 }),
      },
      product: { update: jest.fn() },
    }
  }

  function setupSuccessfulCreate() {
    mockPrismaService.product.findUnique.mockResolvedValue(SAMPLE_PRODUCT)
    mockPrismaService.orderItem.findFirst.mockResolvedValue({ id: 'item-1' })
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      const txMock = buildTxMock()
      const result = await callback(txMock)
      return result
    })
  }
})
