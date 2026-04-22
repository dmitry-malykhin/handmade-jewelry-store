# Google Search Console Setup

Верификация домена, отправка sitemap, мониторинг индексации.

**Время настройки:** ~30 минут  
**Стоимость:** $0  
**Результат:** Google знает о всех страницах, алерты при проблемах с индексацией

---

## Prerequisite

- Домен куплен и DNS настроен (#43)
- Sitemap уже генерируется: `https://yourdomain.com/sitemap.xml`
- robots.txt: `https://yourdomain.com/robots.txt`

---

## Шаг 1 — Добавить property в GSC

1. Зайди на **search.google.com/search-console**
2. **Add property** → **URL prefix** → `https://yourdomain.com`
3. Выбери метод верификации: **HTML tag**
4. Скопируй значение `content` из мета-тега
5. Добавь в Vercel env vars:
   ```
   NEXT_PUBLIC_GSC_VERIFICATION_ID=<скопированное значение>
   ```
6. Redeploy → нажми **Verify** в GSC

---

## Шаг 2 — Отправить sitemap

1. GSC → **Sitemaps** (левое меню)
2. Введи URL: `https://yourdomain.com/sitemap.xml`
3. Нажми **Submit**
4. Статус должен стать **Success** через несколько минут

---

## Шаг 3 — Проверить Index Coverage

1. GSC → **Pages** (Indexing → Pages)
2. Убедиться что нет ошибок **Error** (красные)
3. **Excluded** — нормально для /admin/, /checkout/, /cart/ (robots.txt блокирует)
4. **Valid** — должны быть: homepage, /shop, product pages

---

## Шаг 4 — Настроить email алерты

GSC автоматически шлёт email при:
- Новые crawl errors
- Manual actions (спам-фильтры)
- Core Web Vitals issues

Убедись что email в GSC аккаунте — твой рабочий.

---

## Шаг 5 — Связать с GA4

1. GSC → **Settings** → **Associations** → **Associate** → Google Analytics
2. Выбери GA4 property
3. Это покажет search queries прямо в GA4

---

## Что мониторить еженедельно

| Метрика | Где смотреть | Нормально |
|---------|-------------|-----------|
| Indexed pages | Pages → Valid | Растёт |
| Crawl errors | Pages → Error | 0 |
| Core Web Vitals | Experience → CWV | All green |
| Search queries | Performance → Queries | Растёт |
| Average position | Performance → Pages | < 20 для ключевых |
