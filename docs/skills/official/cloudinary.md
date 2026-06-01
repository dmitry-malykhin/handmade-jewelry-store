# cloudinary

**Priority:** P2 — только если перейдём с Cloudflare R2 / AWS S3 на Cloudinary CDN.

## Что делает

Wrapper над Cloudinary API:
- Upload + transformations (auto-quality, auto-format, на лету resize)
- Image optimization
- AI background removal
- Object detection / tagging
- Видео-transcoding

## Установка

```bash
/plugin install cloudinary@claude-plugins-official --scope project
```

Auth:

```bash
security add-generic-password -a cloudinary-mcp -s claude-mcp -w "<CLOUD_NAME>:<API_KEY>:<API_SECRET>"
```

## Когда подключать

**Сейчас не нужен.** У нас в стеке Cloudflare R2 (для public demo) → AWS S3 + CloudFront (для production). См. [docs/runbooks/cloudflare-r2-setup.md](../../runbooks/cloudflare-r2-setup.md) и [docs/runbooks/aws-cloudfront-s3-setup.md](../../runbooks/aws-cloudfront-s3-setup.md).

Cloudinary — альтернативный путь, если столкнёмся с:
- Slow image optimization на edge (Next/image на serverless deploy может тормозить)
- Нужна сложная обработка (background removal, auto-cropping для категорий)
- Хочется AI-tagging (для search/categorization)

Стоимость: Free tier 25 credits/month, плата за хранение + transformations.

## Что предлагать в плагине

Skills внутри:
- `/cloudinary upload <path>` — загрузка с auto transformations
- `/cloudinary transform <url>` — построить transformation URL
- `/cloudinary list` — listing assets

## Trade-offs

- Vendor lock-in: Cloudinary URLs не переносимы на R2/S3
- Дублирует функционал Next.js Image Optimization (которая работает out of the box на Vercel)
- Имеет смысл только при большом image-heavy каталоге (jewelry — да, но если будет >5000 SKU)

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://cloudinary.com/documentation/mcp-server
