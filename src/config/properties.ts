import {
  ALERT_ALGORITHM,
  ALERT_COOLDOWN_MINUTES,
  DAILY_SUMMARY_CRON,
  HOST,
  LOG_LEVEL,
  MONGODB_URI,
  PORT,
  RATE_CRONJOB_EXPRESSION,
  RATE_THRESHOLD,
  RATE_WINDOW_SIZE,
  RATE_ZSCORE_THRESHOLD,
  RATE_ZSCORE_WINDOW_SIZE,
  TELEGRAM_ADMIN_CHAT_ID,
  TELEGRAM_BOT_TOKEN,
} from '@config/env';

export const properties = {
  app: {
    port: PORT,
    host: HOST,
    logLevel: LOG_LEVEL,
  },
  mongo: {
    uri: MONGODB_URI,
  },
  telegram: {
    botToken: TELEGRAM_BOT_TOKEN,
    apiUrl: 'https://api.telegram.org/bot',
    adminChatId: TELEGRAM_ADMIN_CHAT_ID,
  },
  exchangeRate: {
    apiURL: 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
    alertAlgorithm: ALERT_ALGORITHM,
    rateWindowSize: +RATE_WINDOW_SIZE,
    threshold: +RATE_THRESHOLD,
    zscoreWindowSize: +RATE_ZSCORE_WINDOW_SIZE,
    zscoreThreshold: +RATE_ZSCORE_THRESHOLD,
  },
  job: {
    cronExpression: RATE_CRONJOB_EXPRESSION,
    dailySummaryCron: DAILY_SUMMARY_CRON,
    alertCooldownMs: +ALERT_COOLDOWN_MINUTES * 60 * 1000,
  },
};

// TODO: extend to handle dev, stg, qa environments
