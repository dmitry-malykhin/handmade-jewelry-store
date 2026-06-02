# marketingskills (coreyhaines31)

**Priority:** P1 — критичен для POST-MVP marketing фазы.
**Source:** github.com/coreyhaines31/marketingskills.

## Что делает

32-37 skills под marketing/growth:

### CRO (Conversion Rate Optimization)
- A/B test setup
- Funnel analysis
- Pricing experiments
- Trust signal audit (reviews, badges, guarantees)

### Copywriting
- Product descriptions
- Email subject lines
- Ad copy (Google Ads, Pinterest, Meta)
- Landing page hero copy

### SEO (overlapping с claude-seo)
- Keyword research
- Content gap analysis
- Backlink audit

### Paid Ads
- Google Ads campaign structure
- Pinterest Ads creative
- Meta Ads (Facebook/Instagram) targeting
- Budget allocation

### Growth
- Referral programs
- Email capture optimization
- Re-engagement campaigns

### Email
- Klaviyo flow design (welcome, abandoned cart, post-purchase, win-back)
- Subject line A/B testing
- Send-time optimization

## Установка

```bash
# Manual clone (не в official marketplace)
git clone https://github.com/coreyhaines31/marketingskills /tmp/marketing-skills
cp -r /tmp/marketing-skills/skills/*  .claude/skills/

# Или через npx (если поддерживается):
npx skills add coreyhaines31/marketingskills --scope project
```

**ВАЖНО:** перед установкой проверить — этот репо не во vendor-owned org и не в official marketplace. Применить [security.md](../security.md) чек:
1. Открыть SKILL.md каждого скилла
2. Проверить отсутствие подозрительных bash-команд
3. Установить с pinned commit hash, не `main`

## Когда применять

### W7-W8 — SEO + UX

`/seo content` (overlap с claude-seo) — для product descriptions:

```
/seo content — улучшить описание "Sterling Silver Moonstone Ring" для поиска "handmade silver ring with stone"
```

### W10 — Launch prep

`/copywriting product-description` — массово прогнать через все SKU.

`/cro trust-signals` — проверить что есть reviews badge, secure checkout badge, return policy mention, free shipping threshold.

### POST-MVP

`/klaviyo welcome-flow` — генерация welcome flow с триггерами.
`/paid-ads google-shopping` — структура кампании.
`/paid-ads pinterest-creative` — генерация креативов под pin templates.

## Интеграция с custom skills

- `/klaviyo welcome-flow` — output → как input для custom [klaviyo-flow-spec.md](../custom/klaviyo-flow-spec.md), которая конкретизирует под наш email/event taxonomy
- `/paid-ads google-shopping` — связан с custom [shopping-feed-validate.md](../custom/shopping-feed-validate.md) (валидация feed format)

## Совпадение с docs/16_USER_ANALYTICS.md

`/email klaviyo-flows` — таблица flows priority в docs/16. Skill даёт generic шаблон, мы конкретизируем под наш ивент taxonomy.

## Trade-offs

- Generic skills — не привязаны к нашей юридической локали (EU/US/RF) и нашим товарам. Все outputs нужно адаптировать
- Email regulation (GDPR, CAN-SPAM, CCPA, ФЗ-152) — skill не покрывает. Это пишет юрист
- A/B test setup рекомендации без знания нашего трафика — generic. Использовать как стартовый шаблон

## Безопасность

**До установки — обязательная проверка SKILL.md** (см. [security.md](../security.md)). Если репо ниже 1k stars и/или автор без других проектов — НЕ устанавливать, скопировать только конкретные skills которые нужны и которые прочитаны вручную.

## Альтернативы

Если marketingskills не пройдёт security check — самим написать в `.claude/skills/custom/`:
- `/klaviyo-flow-spec` (наш custom) — частично покрывает email side
- claude-seo + `/seo content` — SEO side
- Для paid ads — пока ручная работа

## Источник

- https://github.com/coreyhaines31/marketingskills
- docs/16_USER_ANALYTICS.md
