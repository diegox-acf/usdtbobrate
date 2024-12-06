import { LOG_LEVEL, MONGODB_URI, PORT, TELEGRAM_BOT_TOKEN } from '@config/env';

export const properties = {
  app: {
    port: PORT,
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
  },
  job: {
    cronExpresion: "'*/10 * * * *'",
  },
};

// TODO: extend to handle dev, stg, qa environments
