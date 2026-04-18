# Domain Setup — Namecheap + Vercel + Route53

Покупка домена и настройка DNS для фронтенда (Vercel) и API (AWS).

**Время настройки:** ~1 час  
**Стоимость:** ~$12–15/год  
**Результат:** `yourdomain.com` → Vercel, `api.yourdomain.com` → ECS/Fly.io

---

## Шаг 1 — Купить домен на Namecheap

1. Зайди на **namecheap.com**
2. Найди подходящий `.com` домен (короткий, запоминаемый, связанный с jewelry)
3. Add to cart → Checkout
4. Включи **WhoisGuard** (бесплатно) — скрывает личные данные в WHOIS
5. Включи **Auto-Renew** — чтобы домен не истёк случайно
6. Оплати (~$12/год)

---

## Шаг 2 — Подключить домен к Vercel (фронтенд)

1. **Vercel Dashboard** → твой проект → **Settings** → **Domains**
2. Add Domain → введи `yourdomain.com`
3. Vercel покажет DNS записи которые нужно добавить

### В Namecheap: настроить DNS записи

1. Namecheap → **Domain List** → **Manage** → **Advanced DNS**
2. Удали все дефолтные записи
3. Добавь записи от Vercel:

```
Type    Host    Value                   TTL
A       @       76.76.21.21             Auto
CNAME   www     cname.vercel-dns.com    Auto
```

4. Подожди 5–30 минут (DNS propagation)
5. В Vercel → Domains → должен появиться зелёный ✅ и SSL сертификат

---

## Шаг 3 — Подключить API субдомен

### Вариант A: Fly.io staging (pre-revenue)

В Namecheap → Advanced DNS добавь:

```
Type    Host            Value                                       TTL
CNAME   api             handmade-jewelry-api-staging.fly.dev        Auto
CNAME   staging.api     handmade-jewelry-api-staging.fly.dev        Auto
```

В Fly.io Dashboard → **Certificates** → **Add Certificate** → `api.yourdomain.com`

### Вариант B: AWS ECS (post-revenue)

1. **Route53** → Create Hosted Zone → `yourdomain.com`
2. Route53 покажет **NS записи** — скопируй их в Namecheap:
   - Namecheap → Domain → **Nameservers** → **Custom DNS** → вставь 4 NS записи от Route53
3. В Route53 создай A Record:

```
Name:   api.yourdomain.com
Type:   A — Alias
Target: ALB DNS name (dualstack.xxx.us-east-1.elb.amazonaws.com)
```

> При Вариант B весь DNS управляется через Route53, не Namecheap.

---

## Шаг 4 — Проверить

```bash
# Frontend
curl -I https://yourdomain.com
# → 200, SSL valid

# API
curl https://api.yourdomain.com/api/health
# → {"status":"ok",...}

# WWW redirect
curl -I https://www.yourdomain.com
# → 301/308 redirect to https://yourdomain.com
```

---

## Шаг 5 — Обновить переменные окружения

После покупки домена обновить:

**Vercel (web):**
```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Fly.io / ECS (api):**
```
FRONTEND_URL=https://yourdomain.com
```

---

## Чеклист

- [ ] Домен куплен на Namecheap
- [ ] Auto-Renew включен
- [ ] WhoisGuard включен
- [ ] DNS записи для Vercel добавлены
- [ ] SSL на фронтенде работает (зелёный замок)
- [ ] API субдомен настроен
- [ ] SSL на API работает
- [ ] Env переменные обновлены
- [ ] `status.yourdomain.com` → UptimeRobot Status Page (опционально)
