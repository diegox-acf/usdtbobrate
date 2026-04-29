# CLAUDE.md

## Project Overview

USDT/BOB Rate Tracker — a Node.js/TypeScript app that monitors the USDT → BOB exchange rate on Binance P2P and sends Telegram alerts when the price moves significantly. Runs as a scheduled background service with a Telegram bot for user interaction.

## Architecture

```
src/
├── config/         # Env validation (Zod), DB, Axios client, Telegram bot, alert cooldown state
├── models/         # Mongoose schemas: ExchangeRate, TelegramUser
├── services/       # Business logic: rate fetching, alert algorithms, user CRUD, messaging
├── jobs/           # node-cron schedulers (rate polling, daily summary)
├── controllers/    # Express route handlers
├── routes/         # Express route definitions
├── events/         # Telegram bot command handlers
├── utils/          # Pure helpers: math, formatting, query builders, logger
└── __tests__/      # Vitest unit tests
```

## Key Files

| File | Purpose |
|---|---|
| `src/server.ts` | Entry point — connects DB, starts HTTP server, starts cron jobs |
| `src/jobs/exchangeRate.job.ts` | Main cron tick: fetch rates, save, run alert algorithms, send alerts |
| `src/jobs/dailySummary.job.ts` | Daily summary cron: queries last 24h rates, broadcasts max/min/avg |
| `src/services/exchangeRate.service.ts` | Rate logic: fetch, save, step check, Kadane, Z-score, daily query |
| `src/services/telegramUser.service.ts` | User CRUD, `sendAlerts(message)`, `sendMessageToUser`, target price helpers |
| `src/config/alertCooldown.ts` | In-memory cooldown state (`isOnCooldown`, `markAlertSent`, `getLastAlertAt`) |
| `src/config/env.ts` | Zod schema for all env vars — calls `process.exit(1)` on missing required vars |
| `src/events/telegramBot.events.ts` | Telegram command handlers (/start, /subscribe, /sell, /buy, /target, /stats, etc.) |

## Alert Algorithms

Two algorithms live in `exchangeRate.service.ts`, selected via `ALERT_ALGORITHM` env var (`kadane`, `zscore`, or `both`). With `both`, both run in parallel and one alert fires if either triggers.

### Kadane (max contiguous increase)
- `computeMaxIncrease(rates: number[])` — pure, exported for testing; rates are newest-first
- Finds the max contiguous sum of positive diffs going oldest→newest
- Triggers if `maxIncrease >= RATE_THRESHOLD`
- Good for sustained momentum; works with small windows (default: 6 readings)

### Z-score (statistical outlier)
- `computeZScore(current, historical[])` — pure, exported for testing
- `z = (current − mean) / stddev` against the historical baseline window
- Returns 0 when stddev is 0 (flat market) — avoids false fires
- Triggers if `z >= RATE_ZSCORE_THRESHOLD` (default: 2.0)
- Adapts to volatility; needs a larger window (default: 20 readings)
- Fetches `windowSize + 1` docs; `rates[0]` is current, `rates.slice(1)` is historical baseline

### Step alert
- `stepCrossed(current, previous)` — pure function, no shared state
- `toStep(v) = Math.floor(Math.round(v * 100) / 10)` — integer math avoids float boundary errors
- Compares current vs the last saved SELL rate (read before saving the new rate in the tick)
- Correctly handles multi-step jumps and server restarts with no initialization required

### Alert cooldown
- `src/config/alertCooldown.ts` — in-memory; losing state on restart is acceptable (worst case: one extra alert)
- Broadcast alerts (high rate + step) are suppressed during the cooldown window
- Target price alerts bypass the cooldown — they are personal, one-time signals

## Data Model

```ts
ExchangeRate { rate: number, timestamp: number, tradeType: 'SELL' | 'BUY' }
TelegramUser { chatId: number, targetPrice?: number }  // chatId has unique index
```

Both SELL and BUY rates are fetched and saved each cron tick. Alert algorithms, step check, and daily summary all query `{ tradeType: 'SELL' }` only.

## Cron Jobs

| Job | Default schedule | Purpose |
|---|---|---|
| `startJobScheduler` | `*/30 * * * *` | Fetch rates, run alert algorithms, check targets |
| `startDailySummaryJob` | `0 12 * * *` | Broadcast daily max/min/avg to all subscribers |

## Telegram Commands

| Command | Who | Description |
|---|---|---|
| `/start` | All | Show menu |
| `/subscribe` | All | Register for alerts |
| `/unsubscribe` | All | Deregister |
| `/sell` | All | Current sell rate + trend |
| `/buy` | All | Current buy rate + trend |
| `/target <price>` | All | Set personal target price alert |
| `/cleartarget` | All | Remove personal target |
| `/stats` | Admin only | Subscriber count, last rate, last alert time |

Admin is identified by `TELEGRAM_ADMIN_CHAT_ID`. Non-admin `/stats` calls are silently ignored.

## Testing

- **Framework:** Vitest with `globals: true`
- **Path aliases:** resolved via `resolve.tsconfigPaths: true` in `vitest.config.ts`
- **Mocked modules:** `@config/properties`, `@config/client`, `@utils/logger`, `@models/exchangeRate.model`
- Pure algorithm functions (`computeMaxIncrease`, `computeZScore`, `stepCrossed`) are exported specifically for unit testing
- Mongoose query chains are mocked as `{ sort: fn → { limit: fn → { exec: fn → Promise } } }`

Run: `pnpm test:run`

## Development Notes

- pnpm is the package manager — do not use npm or yarn
- TypeScript path aliases are configured in `tsconfig.json` (`@config/*`, `@services/*`, etc.)
- `src/config/env.ts` runs Zod validation at import time — mock `@config/properties` in tests, not `@config/env`
- `tradeType` is required on `ExchangeRate`; existing DB documents without it will cause `getLastExchangeRateHistory` to return null on startup — clear the collection or run a migration if needed
- Bolivia timezone is GMT-4; handled manually in `getLocalDate()` in `src/utils/index.ts`
- `sendAlerts(message: string)` broadcasts to all subscribers; the caller is responsible for constructing the message string
- `sendMessageToUser(chatId, message)` sends to a single user — used for target price notifications

## Active Work (Ongoing Tasks)

1. **Bugs** ✅ — all fixed
2. **Algorithm** ✅ — Z-score + Kadane, selectable via `ALERT_ALGORITHM`
3. **New features** ✅ — trend indicator, cooldown, daily summary, target price alerts, admin `/stats`
4. **Telegram navigation** — pending (inline keyboard buttons, user preferences/settings flow, conversation state)
