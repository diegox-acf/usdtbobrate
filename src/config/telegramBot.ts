import TelegramBot from 'node-telegram-bot-api';
import { properties } from './properties';

const telegramBot: TelegramBot = new TelegramBot(properties.telegram.botToken, {
  polling: true,
  request: {
    agentOptions: {
      keepAlive: true,
      family: 4,
    },
    url: 'https://api.telegram.org',
  },
});

export default telegramBot;
