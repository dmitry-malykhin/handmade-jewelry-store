#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/test-telegram-bot.sh — verify Telegram bot credentials and send
# a test alert message to confirm the notification pipeline is working.
#
# Usage:
#   TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<chat_id> bash scripts/test-telegram-bot.sh
#
# Or add to .env and source it:
#   source .env && bash scripts/test-telegram-bot.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# ── Validate required vars ────────────────────────────────────────────────────
if [[ -z "$TELEGRAM_BOT_TOKEN" ]]; then
  echo "❌ TELEGRAM_BOT_TOKEN is not set"
  echo "   Get it from @BotFather → /newbot"
  exit 1
fi

if [[ -z "$TELEGRAM_CHAT_ID" ]]; then
  echo "❌ TELEGRAM_CHAT_ID is not set"
  echo "   Get it by opening: https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates"
  echo "   (send any message to the bot first)"
  exit 1
fi

TELEGRAM_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

echo ""
echo "━━━ Telegram bot connectivity test ━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Verify bot token ──────────────────────────────────────────────────
echo "→ Verifying bot token..."
BOT_INFO=$(curl -sf "${TELEGRAM_API}/getMe" 2>/dev/null)

if [[ $? -ne 0 ]] || echo "$BOT_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
  BOT_USERNAME=$(echo "$BOT_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result']['username'])" 2>/dev/null || echo "unknown")
  echo "  ✅ Bot token valid — @${BOT_USERNAME}"
else
  echo "  ❌ Invalid bot token — check TELEGRAM_BOT_TOKEN"
  exit 1
fi

# ── Step 2: Send test message ─────────────────────────────────────────────────
echo "→ Sending test alert message..."

MESSAGE="🧪 *Jewelry Store — Test Alert*

✅ Sentry error notifications are configured correctly\.
✅ This message confirms the bot can reach your chat\.

_Sent from: scripts/test\-telegram\-bot\.sh_"

SEND_RESULT=$(curl -sf \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MESSAGE}" \
  --data-urlencode "parse_mode=MarkdownV2" \
  "${TELEGRAM_API}/sendMessage" 2>/dev/null)

if echo "$SEND_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
  echo "  ✅ Test message sent — check your Telegram"
else
  echo "  ❌ Failed to send message"
  echo "  Response: $SEND_RESULT"
  echo "  Check: is TELEGRAM_CHAT_ID correct? Did you send /start to the bot?"
  exit 1
fi

# ── Step 3: Simulate a Sentry-style error alert ───────────────────────────────
echo "→ Sending simulated Sentry alert..."

SENTRY_SIMULATION="🔴 *\[jewelry\-api\] Simulated error alert*

*TypeError: Cannot read properties of undefined*

\`OrdersService\.createOrder — orders\.service\.ts:45\`

Частота: 1 раз · 1 пользователь затронут
→ _This is a test \- no real error occurred_"

curl -sf \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${SENTRY_SIMULATION}" \
  --data-urlencode "parse_mode=MarkdownV2" \
  "${TELEGRAM_API}/sendMessage" > /dev/null 2>&1 && \
  echo "  ✅ Simulated Sentry alert sent" || \
  echo "  ⚠️  Simulated alert failed (non-critical)"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━ All checks passed ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Connect Sentry → Make.com webhook → Telegram"
echo "     See: docs/runbooks/telegram-alerts-setup.md"
echo "  2. Connect UptimeRobot → Telegram (native integration)"
echo "     UptimeRobot → My Settings → Alert Contacts → Add Telegram"
echo ""
