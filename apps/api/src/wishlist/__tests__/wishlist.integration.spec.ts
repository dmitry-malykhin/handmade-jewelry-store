/**
 * HTTP integration test for the Wishlist module — exercises the full
 * NestJS request pipeline (JWT guard, ValidationPipe, controller, service)
 * with Prisma fully mocked. Mirrors the contract used by the frontend.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import * as request from 'supertest'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { JwtStrategy } from '../../auth/strategies/jwt.strategy'
import { PrismaService } from '../../prisma/prisma.service'
import { UsersService } from '../../users/users.service'
import { WishlistController } from '../wishlist.controller'
import { WishlistService } from '../wishlist.service'

const VALID_JWT_SECRET = 'test-secret-for-integration'
const TEST_USER = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed',
  role: Role.USER,
  passwordResetToken: null,
  passwordResetTokenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPrismaService = {
  product: { findUnique: jest.fn(), findMany: jest.fn() },
  wishlist: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
}

const mockUsersService = { findById: jest.fn() }

describe('Wishlist HTTP integration', () => {
  let app: INestApplication
  let validToken: string

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: VALID_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [WishlistController],
      providers: [
        WishlistService,
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

  it('returns 401 on GET /wishlist without token', async () => {
    await request(app.getHttpServer()).get('/api/wishlist').expect(401)
  })

  it('returns 401 on POST /wishlist/:productId without token', async () => {
    await request(app.getHttpServer()).post('/api/wishlist/p1').expect(401)
  })

  it('returns 200 + products list on GET /wishlist', async () => {
    mockPrismaService.wishlist.findUnique.mockResolvedValue({
      products: [{ id: 'p1', title: 'Ring' }],
    })

    const response = await request(app.getHttpServer())
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)

    expect(response.body).toEqual([{ id: 'p1', title: 'Ring' }])
  })

  it('returns 201 + {added: true} on POST /wishlist/:productId for an existing product', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue({ id: 'p1' })
    mockPrismaService.wishlist.upsert.mockResolvedValue({})

    const response = await request(app.getHttpServer())
      .post('/api/wishlist/p1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(201)

    expect(response.body).toEqual({ added: true })
  })

  it('returns 404 on POST /wishlist/:productId when product is unknown', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue(null)

    await request(app.getHttpServer())
      .post('/api/wishlist/missing')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(404)

    expect(mockPrismaService.wishlist.upsert).not.toHaveBeenCalled()
  })

  it('returns 200 + {removed: true} on DELETE /wishlist/:productId (idempotent for missing wishlist)', async () => {
    mockPrismaService.wishlist.findUnique.mockResolvedValue(null)

    const response = await request(app.getHttpServer())
      .delete('/api/wishlist/p1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)

    expect(response.body).toEqual({ removed: true })
  })

  it('returns 200 + merged products on POST /wishlist/merge', async () => {
    mockPrismaService.product.findMany.mockResolvedValue([{ id: 'p1' }])
    mockPrismaService.wishlist.upsert.mockResolvedValue({})
    mockPrismaService.wishlist.findUnique.mockResolvedValue({
      products: [{ id: 'p1', title: 'Ring' }],
    })

    const response = await request(app.getHttpServer())
      .post('/api/wishlist/merge')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productIds: ['p1'] })
      .expect(200)

    expect(response.body).toEqual([{ id: 'p1', title: 'Ring' }])
  })

  it('returns 400 on POST /wishlist/merge with non-array productIds', async () => {
    await request(app.getHttpServer())
      .post('/api/wishlist/merge')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productIds: 'not-an-array' })
      .expect(400)
  })

  it('returns 400 on POST /wishlist/merge with > 200 ids', async () => {
    const tooMany = Array.from({ length: 201 }, (_, index) => `p${index}`)
    await request(app.getHttpServer())
      .post('/api/wishlist/merge')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ productIds: tooMany })
      .expect(400)
  })
})
