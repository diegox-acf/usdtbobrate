import TelegramBot from 'node-telegram-bot-api';
import { properties } from './properties';

const telegramBot: TelegramBot = new TelegramBot(properties.telegram.botToken, {
  polling: true,
});

export default telegramBot;
