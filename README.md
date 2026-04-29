# USDT/BOB Rate Tracker

Monitors the USDT → Bolivian Boliviano (BOB) exchange rate on Binance P2P and sends alerts via Telegram when the price moves significantly.

## Features

- **Scheduled rate polling** — fetches SELL and BUY rates from Binance P2P every 30 minutes (configurable), averaging prices across active merchants
- **Persistent history** — stores every reading in MongoDB with trade type (SELL/BUY) and timestamp
- **Two alert algorithms** (selectable via config):
  - **Z-score** *(default)* — alerts when the current rate is statistically unusual relative to recent history (N standard deviations above the mean). Adapts to market volatility automatically.
  - **Kadane** — alerts when the maximum contiguous price increase within a sliding window exceeds a threshold.
  - **Both** — runs both in parallel; sends one alert if either triggers.
- **Step alert** — fires whenever the rate crosses a new 0.1 BOB threshold (e.g. 6.9 → 7.0)
- **Alert cooldown** — minimum time between broadcast alerts to avoid spamming (configurable, default 60 min)
- **Trend indicator** — every alert and on-demand rate includes a direction indicator (e.g. `↑ +0.15`, `↓ -0.05`)
- **Daily summary** — scheduled Telegram broadcast with the day's max, min, and average SELL rate
- **Target price alert** — users set a personal target price; get a one-time notification when it is reached
- **Per-user alert preferences** — each subscriber can independently toggle step alerts and high-rate alerts on/off
- **Inline keyboard navigation** — full menu-driven bot UI; no need to remember commands
- **Admin commands** — operator-only `/stats` showing subscriber count, last rate, and last alert time
- **REST API** — endpoint to retrieve full rate history (debug)

## Tech Stack

- **Runtime:** Node.js 22, TypeScript
- **Framework:** Express
- **Database:** MongoDB (Mongoose)
- **Scheduler:** node-cron
- **Messaging:** node-telegram-bot-api
- **Config validation:** Zod
- **Logging:** Winston
- **Testing:** Vitest
- **Package manager:** pnpm
- **Container:** Docker (Node 22 Alpine)

## Prerequisites

- Node.js >= 20.6.0
- pnpm
- MongoDB instance
- Telegram bot token (create one via [@BotFather](https://t.me/BotFather))

## Setup

```bash
pnpm install
cp .env.example .env
# fill in your values in .env
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `localhost` | HTTP server host |
| `MONGODB_URI` | — | MongoDB connection string (**required**) |
| `NODE_ENV` | `dev` | Environment (`dev` or `prod`) |
| `LOG_LEVEL` | `info` | Winston log level |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token (**required**) |
| `TELEGRAM_ADMIN_CHAT_ID` | — | Chat ID of the admin user for `/stats` |
| `ALERT_ALGORITHM` | `zscore` | Alert algorithm: `kadane`, `zscore`, or `both` |
| `ALERT_COOLDOWN_MINUTES` | `60` | Minimum minutes between broadcast alerts (`0` = no cooldown) |
| `RATE_CRONJOB_EXPRESSION` | `*/30 * * * *` | Cron expression for rate polling |
| `DAILY_SUMMARY_CRON` | `0 12 * * *` | Cron expression for daily summary (default: noon) |
| `RATE_WINDOW_SIZE` | `6` | Lookback window for Kadane algorithm (readings) |
| `RATE_THRESHOLD` | `0.25` | Minimum cumulative increase to trigger Kadane alert |
| `RATE_ZSCORE_WINDOW_SIZE` | `20` | Historical baseline window for Z-score (readings) |
| `RATE_ZSCORE_THRESHOLD` | `2.0` | Standard deviations above mean to trigger Z-score alert |

## Running

```bash
# Development (hot reload)
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## Testing

```bash
pnpm test        # watch mode
pnpm test:run    # single run (CI)
```

## Docker

```bash
docker build -t usdtbobrate .
docker run -p 3001:3001 --env-file .env usdtbobrate
```

## Telegram Bot

The bot is fully menu-driven. Send `/start` to open the main menu — all features are accessible via inline buttons without memorising any commands.

### Main menu

```
[ 🔔 Suscribirse ]          (or 🔕 Cancelar suscripción if already subscribed)
[ 💵 Precio venta ] [ 💵 Precio compra ]
[ ⚙️ Configuración ]
```

### Settings menu (`⚙️ Configuración`)

```
[ ✅ Alertas de paso ]
[ ✅ Alertas de precio alto ]
[ 🎯 Establecer precio objetivo ]
[ 🗑️ Quitar objetivo (7.20) ]   ← only shown when a target is active
[ 🔙 Volver ]
```

Tapping a toggle updates it in-place. Tapping **Establecer precio objetivo** starts a conversation: the bot asks for a price and the next message you send becomes the target.

### Commands (also available as text)

| Command | Description |
|---|---|
| `/start` | Open the main menu |
| `/subscribe` | Subscribe to alerts |
| `/unsubscribe` | Unsubscribe |
| `/sell` | Current USDT→BOB sell rate + trend |
| `/buy` | Current USDT→BOB buy rate + trend |
| `/settings` | Open the settings menu |
| `/target <price>` | Set a personal target price (e.g. `/target 7.20`) |
| `/cleartarget` | Remove your target price |
| `/stats` | *(Admin only)* Subscriber count, last rate, last alert time |

## REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/exchange-rates` | Returns full rate history from MongoDB |
