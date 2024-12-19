import {
  RATE_CRONJOB_EXPRESSION,
  HOST,
  LOG_LEVEL,
  MONGODB_URI,
  PORT,
  TELEGRAM_BOT_TOKEN,
  RATE_THRESHOLD,
  RATE_WINDOW_SIZE,
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
  },
  exchangeRate: {
    apiURL: 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
    rateWindowSize: +RATE_WINDOW_SIZE,
    threshold: +RATE_THRESHOLD,
  },
  job: {
    cronExpression: RATE_CRONJOB_EXPRESSION,
  },
};

// TODO: extend to handle dev, stg, qa environments
