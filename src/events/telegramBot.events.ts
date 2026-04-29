import telegramBot from '@config/telegramBot';
import { properties } from '@config/properties';
import { getLastAlertAt } from '@config/alertCooldown';
import { TelegramUser } from '@models/telegramUser.model';
import {
  generateExchangeRateHistoryEntry,
  getLastExchangeRateHistory,
} from '@services/exchangeRate.service';
import {
  clearTargetPrice,
  deleteUser,
  getUserCount,
  saveUser,
  updateUser,
} from '@services/telegramUser.service';
import { formatPrice, formatTrend, getLocalDate } from '@utils/index';
import { Message } from 'node-telegram-bot-api';

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
    const [current, lastEntry] = await Promise.all([
      generateExchangeRateHistoryEntry('SELL'),
      getLastExchangeRateHistory(),
    ]);
    const trend = lastEntry ? formatTrend(current.rate, lastEntry.rate) : '';
    telegramBot.sendMessage(
      chatId,
      `El tipo de cambio para la venta es: ${formatPrice(current.rate)} ${trend}`
    );
  } catch (error: any) {
    telegramBot.sendMessage(chatId, 'Ocurrio un error');
  }
});

telegramBot.onText(/\/buy/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const [current, lastSellEntry] = await Promise.all([
      generateExchangeRateHistoryEntry('BUY'),
      getLastExchangeRateHistory(),
    ]);
    const trend = lastSellEntry ? formatTrend(current.rate, lastSellEntry.rate) : '';
    telegramBot.sendMessage(
      chatId,
      `El tipo de cambio para la compra es: ${formatPrice(current.rate)} ${trend}`
    );
  } catch (error: any) {
    telegramBot.sendMessage(chatId, 'Ocurrio un error');
  }
});

telegramBot.onText(/\/target (.+)/, async (msg: Message, match) => {
  const chatId = msg.chat.id;
  const price = parseFloat(match?.[1] ?? '');
  if (isNaN(price) || price <= 0) {
    telegramBot.sendMessage(chatId, 'Precio invalido. Uso: /target 7.20');
    return;
  }
  try {
    await updateUser(String(chatId), { targetPrice: price });
    telegramBot.sendMessage(
      chatId,
      `Precio objetivo establecido: ${formatPrice(price)}`
    );
  } catch (error) {
    telegramBot.sendMessage(chatId, 'Ocurrio un error');
  }
});

telegramBot.onText(/\/cleartarget/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    await clearTargetPrice(String(chatId));
    telegramBot.sendMessage(chatId, 'Precio objetivo eliminado');
  } catch (error) {
    telegramBot.sendMessage(chatId, 'Ocurrio un error');
  }
});

telegramBot.onText(/\/stats/, async (msg: Message) => {
  if (String(msg.chat.id) !== properties.telegram.adminChatId) return;
  try {
    const [count, lastEntry] = await Promise.all([
      getUserCount(),
      getLastExchangeRateHistory(),
    ]);
    const lastAlert = getLastAlertAt();
    const lines = [
      `👥 Suscriptores: ${count}`,
      lastEntry
        ? `📈 Último precio: ${formatPrice(lastEntry.rate)} (${getLocalDate(lastEntry.timestamp)})`
        : `📈 Sin datos`,
      lastAlert > 0
        ? `🔔 Última alerta: ${getLocalDate(lastAlert)}`
        : `🔔 Sin alertas enviadas`,
    ];
    telegramBot.sendMessage(msg.chat.id, lines.join('\n'));
  } catch (error) {
    telegramBot.sendMessage(msg.chat.id, 'Ocurrio un error');
  }
});
