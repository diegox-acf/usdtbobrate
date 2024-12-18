import { ExchangeRate } from '@models/exchangeRate.model';
import { TelegramUser } from '@models/telegramUser.model';
import { generateExchangeRateHistoryEntry } from '@services/exchangeRate.service';
import { formatPrice } from '@utils/index';

import { Message } from 'node-telegram-bot-api';
import telegramBot from '@config/telegramBot';
import { deleteUser, saveUser } from '@services/telegramUser.service';

telegramBot.onText(/\/start/, (msg: Message) => {
  telegramBot.sendMessage(msg.chat.id, 'Welcome', {
    reply_markup: {
      keyboard: [
        [{ text: '/subscribe' }, { text: '/unsubscribe' }],
        [{ text: '/buy' }, { text: '/sell' }],
      ],
      one_time_keyboard: true,
    },
  });
});

telegramBot.onText(/\/subscribe/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const telegramUser: TelegramUser = { chatId };
    await saveUser(telegramUser);
    telegramBot.sendMessage(
      chatId,
      'Te subscribiste a las notificationes en tiempo real'
    );
  } catch (error: any) {
    if (error.code === 11000) {
      telegramBot.sendMessage(chatId, 'Ya estas subscrito');
    } else {
      telegramBot.sendMessage(
        chatId,
        'Ocurrion un error al momento del registro'
      );
    }
  }
});

telegramBot.onText(/\/unsubscribe/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const telegramUser: TelegramUser = { chatId };
    await deleteUser(telegramUser);
    telegramBot.sendMessage(msg.chat.id, 'Te hecharemos de menos 😞');
  } catch (error) {
    telegramBot.sendMessage(chatId, 'Ocurrio un error');
  }
});

telegramBot.onText(/\/sell/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const exchangeRate: ExchangeRate =
      await generateExchangeRateHistoryEntry('SELL');
    telegramBot.sendMessage(
      chatId,
      `El tipo de cambio para la venta es: ${formatPrice(exchangeRate.rate)}`
    );
  } catch (error: any) {
    telegramBot.sendMessage(chatId, 'Ocurrio un error');
  }
});

telegramBot.onText(/\/buy/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const exchangeRate: ExchangeRate =
      await generateExchangeRateHistoryEntry('BUY');
    telegramBot.sendMessage(
      chatId,
      `El tipo de cambio para la compra es: ${formatPrice(exchangeRate.rate)}`
    );
  } catch (error: any) {
    telegramBot.sendMessage(chatId, 'Ocurrio un error');
  }
});
