# new-nest-module (custom)

**Priority:** 3 (top-5).
**Effort:** low.
**Impact:** high — экономит ~30 мин на каждый новый backend домен.

## Что делает

Скаффолд нового NestJS модуля под `apps/api/src/<name>/`:

- `<name>.module.ts`
- `<name>.controller.ts` — только приёмка/возврат
- `<name>.service.ts` — вся бизнес-логика
- `dto/create-<name>.dto.ts` + другие DTO с `class-validator`
- `<name>.service.spec.ts` + `<name>.controller.spec.ts` стартовые
- Подключение к `app.module.ts`
- `JwtAuthGuard` на protected routes
- Winston logger injection с `correlationId`
- Prisma client injection
- Mapper для return — без password / sensitive fields

## Trigger

- User: `/new-nest-module gift-cards` или "создай модуль returns"

## Установка

Создать `.claude/skills/new-nest-module/SKILL.md`:

````markdown
---
name: new-nest-module
description: Use when the user asks to create a new backend domain/module (e.g. "create gift-cards module", "add returns API", "new module for inventory"). Scaffolds apps/api/src/<name>/ with module/controller/service/dto, JWT guard, Winston logger, Prisma client, and Vitest spec stubs.
---

# new-nest-module

## Inputs

1. **Module name** — kebab-case (`gift-cards`, `inventory`, `returns`).
2. **Protected?** Default yes (most business endpoints need auth). Public — only if explicit.
3. **Has Prisma model?** If yes — model name (PascalCase singular: `GiftCard`).
4. **Stripe-related?** If yes — inject `StripeService`.

## Files created

```
apps/api/src/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── <name>.service.spec.ts
├── <name>.controller.spec.ts
└── dto/
    ├── create-<name>.dto.ts
    ├── update-<name>.dto.ts
    └── <name>-response.dto.ts
```

Wire into `apps/api/src/app.module.ts` (`imports: [..., <Name>Module]`).

## Templates

### `<name>.module.ts`

```ts
import { Module } from '@nestjs/common'
import { <Name>Controller } from './<name>.controller'
import { <Name>Service } from './<name>.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [<Name>Controller],
  providers: [<Name>Service],
  exports: [<Name>Service],
})
export class <Name>Module {}
```

### `<name>.controller.ts`

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { <Name>Service } from './<name>.service'
import { Create<Name>Dto } from './dto/create-<name>.dto'

@Controller('<name-plural>')
@UseGuards(JwtAuthGuard)
export class <Name>Controller {
  constructor(private readonly <name>Service: <Name>Service) {}

  @Post()
  async create(@Body() createDto: Create<Name>Dto) {
    return this.<name>Service.create(createDto)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.<name>Service.findOne(id)
  }
}
```

### `<name>.service.ts`

```ts
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Create<Name>Dto } from './dto/create-<name>.dto'

@Injectable()
export class <Name>Service {
  private readonly logger = new Logger(<Name>Service.name)

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: Create<Name>Dto) {
    this.logger.log({ message: 'creating <name>', dto: createDto })
    // business logic here
    return this.prisma.<model>.create({ data: createDto })
  }

  async findOne(id: string) {
    return this.prisma.<model>.findUnique({ where: { id } })
  }
}
```

### DTO templates

```ts
import { IsString, IsInt, IsOptional, Min } from 'class-validator'

export class Create<Name>Dto {
  @IsString()
  name!: string

  @IsInt()
  @Min(0)
  priceCents!: number  // Always cents, see docs/09

  @IsOptional()
  @IsString()
  description?: string
}
```

## Hard rules (from CLAUDE.md)

1. **Business logic only in Service**. Controller accepts/returns only.
2. **DTO with class-validator** on every endpoint.
3. **`@UseGuards(JwtAuthGuard)`** on protected controllers — default yes.
4. **No `any`**. All types explicit.
5. **Never return password, hashed tokens, raw Stripe secrets**. Use mapper / response DTO.
6. **Errors via `HttpException` subclasses** (`NotFoundException`, `BadRequestException`), not raw `throw`.
7. **Logger via `Logger`** from `@nestjs/common`, **never** `console.log`.
8. **Money fields**: `Int` cents, suffix `Cents`. **Measurements**: metric, `Cm`/`Grams`.
9. **Shared types** → `packages/shared/src/index.ts` if used by frontend too.

## Optional flags

- `--with-prisma-model <Name>` → also append model to `apps/api/prisma/schema.prisma`, generate migration via `/prisma-migrate-safe` skill, update seed.
- `--with-stripe` → inject `StripeService` + idempotency helper for webhook handlers.
- `--public` → controller without `@UseGuards(JwtAuthGuard)`, but add explicit comment why.

## Post-scaffold

1. Run `pnpm --filter api typecheck` — verify no compilation errors.
2. Run new spec file: `pnpm --filter api test:run -- --testPathPattern="<name>"`.
3. Add OpenAPI tags if the project uses Swagger (`@ApiTags('<name>')`).
4. Update `docs/12_PLAN_PERSONAL.md` if this closes a roadmap item.
````

## Trade-offs

- Generated code — стартовая точка. Service логика всё равно пишется вручную
- Spec файлы — стартовые (один test для `create`), полноценные тесты добавляются через `/cowrite-tests`

## Зависимости

- NestJS 11
- Prisma 6
- `JwtAuthGuard` существует в `apps/api/src/auth/`
- Winston logger configured

## Источник

- CLAUDE.md → раздел "NestJS (backend)"
- docs/03_CODE_RULES.docx
- docs/14_LOGGING.md (Winston + correlationId)
