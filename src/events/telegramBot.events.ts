import { TELEGRAM_BOT_TOKEN } from '@constants/telegramBot.constants';
import { ExchangeRate } from '@models/exchangeRate.model';
import { TelegramUser } from '@models/telegramUser.model';
import { generateExchangeRateHistoryEntry } from '@services/exchangeRate.service';
import TelegramUserService from '@services/telegramUser.service';

import TelegramBot, { Message } from 'node-telegram-bot-api';

const bot: TelegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg: Message) => {
  bot.sendMessage(msg.chat.id, 'Welcome', {
    reply_markup: {
      keyboard: [
        [{ text: '/subscribe' }, { text: '/unsubscribe' }],
        [{ text: '/buy' }, { text: '/sell' }],
      ],
      one_time_keyboard: true,
    },
  });
});

bot.onText(/\/subscribe/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const telegramUser: TelegramUser = { chatId };
    await TelegramUserService.saveUser(telegramUser);
    bot.sendMessage(
      chatId,
      'Te subscribiste a las notificationes en tiempo real'
    );
  } catch (error: any) {
    if (error.code === 11000) {
      bot.sendMessage(chatId, 'Ya estas subscrito');
    } else {
      bot.sendMessage(chatId, 'Ocurrion un error al momento del registro');
    }
  }
});

bot.onText(/\/unsubscribe/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const telegramUser: TelegramUser = { chatId };
    await TelegramUserService.deleteUser(telegramUser);
    bot.sendMessage(msg.chat.id, 'Te hecharemos de menos 😞');
  } catch (error) {
    bot.sendMessage(chatId, 'Ocurrio un error');
  }
});

bot.onText(/\/sell/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const exchangeRate: ExchangeRate =
      await generateExchangeRateHistoryEntry('SELL');
    bot.sendMessage(
      chatId,
      `El tipo de cambio para la venta es: ${exchangeRate.rate}`
    );
  } catch (error: any) {
    bot.sendMessage(chatId, 'Ocurrio un error');
  }
});

bot.onText(/\/buy/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const exchangeRate: ExchangeRate =
      await generateExchangeRateHistoryEntry('BUY');
    bot.sendMessage(
      chatId,
      `El tipo de cambio para la compra es: ${exchangeRate.rate}`
    );
  } catch (error: any) {
    bot.sendMessage(chatId, 'Ocurrio un error');
  }
});
