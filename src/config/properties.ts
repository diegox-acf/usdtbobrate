import {
  HOST,
  LOG_LEVEL,
  MONGODB_URI,
  PORT,
  TELEGRAM_BOT_TOKEN,
} from '@config/env';

export const properties = {
  app: {
    port: PORT,
    host: HOST,
    logLevel: LOG_LEVEL,
    rateWindowSize: 5,
    rateK: 4,
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
  },
  job: {
    cronExpression: '0 * * * *',
  },
};

// TODO: extend to handle dev, stg, qa environments
