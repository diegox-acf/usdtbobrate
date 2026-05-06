import { getLastAlertAt } from '@config/alertCooldown';
import { getState, setState } from '@config/conversationState';
import { properties } from '@config/properties';
import telegramBot from '@config/telegramBot';
import { AlertSensitivity, TelegramUser } from '@models/telegramUser.model';
import {
  generateExchangeRateHistoryEntry,
  getLastExchangeRateHistory,
} from '@services/exchangeRate.service';
import {
  clearTargetPrice,
  deleteUser,
  getUserByChatId,
  getUserCount,
  saveUser,
  updateUser,
} from '@services/telegramUser.service';
import { formatPrice, formatTrend, getLocalDate } from '@utils/index';
import { InlineKeyboardButton, Message } from 'node-telegram-bot-api';

// ─── Keyboard builders ────────────────────────────────────────────────────────

const mainMenuKeyboard = (isSubscribed: boolean) => {
  const rows: InlineKeyboardButton[][] = [
    [
      isSubscribed
        ? { text: '🔕 Cancelar suscripción', callback_data: 'unsubscribe' }
        : { text: '🔔 Suscribirse', callback_data: 'subscribe' },
    ],
    [
      { text: '💵 Precio venta', callback_data: 'check_sell' },
      { text: '💵 Precio compra', callback_data: 'check_buy' },
    ],
    [{ text: '⚙️ Configuración', callback_data: 'settings' }],
  ];
  if (properties.telegram.webAppUrl) {
    rows.splice(2, 0, [{ text: '📈 Ver historial', web_app: { url: properties.telegram.webAppUrl } } as any]);
  }
  return { inline_keyboard: rows };
};

const sensitivityLabel: Record<AlertSensitivity, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const sensitivityMenuKeyboard = (current: AlertSensitivity) => ({
  inline_keyboard: [
    [{ text: `${current === 'alta' ? '✅' : '  '} Alta — alertas frecuentes`, callback_data: 'set_sensitivity_alta' }],
    [{ text: `${current === 'media' ? '✅' : '  '} Media — por defecto`, callback_data: 'set_sensitivity_media' }],
    [{ text: `${current === 'baja' ? '✅' : '  '} Baja — solo grandes subidas`, callback_data: 'set_sensitivity_baja' }],
    [{ text: '🔙 Configuración', callback_data: 'settings' }],
  ],
});

const settingsMenuKeyboard = (user: TelegramUser) => {
  const stepEnabled = user.alertStepEnabled !== false;
  const highRateEnabled = user.alertHighRateEnabled !== false;
  const sensitivity = user.alertSensitivity ?? 'media';
  return {
    inline_keyboard: [
      [
        {
          text: `${stepEnabled ? '✅' : '❌'} Alertas de cambio de precio`,
          callback_data: 'toggle_step',
        },
      ],
      [
        {
          text: `${highRateEnabled ? '✅' : '❌'} Alertas de precio alto`,
          callback_data: 'toggle_high_rate',
        },
      ],
      [
        {
          text: `📊 Sensibilidad: ${sensitivityLabel[sensitivity]}`,
          callback_data: 'sensitivity_menu',
        },
      ],
      [{ text: '🎯 Establecer precio objetivo', callback_data: 'set_target' }],
      ...(user.targetPrice
        ? [
            [
              {
                text: `🗑️ Quitar objetivo (${formatPrice(user.targetPrice)})`,
                callback_data: 'clear_target',
              },
            ],
          ]
        : []),
      [{ text: '🔙 Volver', callback_data: 'main_menu' }],
    ],
  };
};

// ─── Text commands ─────────────────────────────────────────────────────────────

telegramBot.onText(/\/start/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const existing = await getUserByChatId(String(chatId));
  telegramBot.sendMessage(
    chatId,
    existing
      ? '¡Bienvenido de nuevo! ¿Qué deseas hacer?'
      : '¡Bienvenido! Suscríbete para recibir alertas de precio.',
    { reply_markup: mainMenuKeyboard(!!existing) }
  );
});

telegramBot.onText(/\/settings/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const doc = await getUserByChatId(String(chatId));
  if (!doc) {
    telegramBot.sendMessage(
      chatId,
      'Primero debes suscribirte con /subscribe o desde el menú.'
    );
    return;
  }
  telegramBot.sendMessage(chatId, '⚙️ Configuración', {
    reply_markup: settingsMenuKeyboard(doc.toObject() as TelegramUser),
  });
});

telegramBot.onText(/\/subscribe/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    await saveUser({
      chatId,
      alertStepEnabled: true,
      alertHighRateEnabled: true,
    });
    telegramBot.sendMessage(chatId, '✅ Te suscribiste a las notificaciones.', {
      reply_markup: mainMenuKeyboard(true),
    });
  } catch (error: any) {
    telegramBot.sendMessage(
      chatId,
      error.code === 11000
        ? 'Ya estás suscrito.'
        : 'Ocurrió un error al registrarte.'
    );
  }
});

telegramBot.onText(/\/unsubscribe/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    await deleteUser({
      chatId,
      alertStepEnabled: true,
      alertHighRateEnabled: true,
    });
    telegramBot.sendMessage(
      chatId,
      'Te dimos de baja. ¡Te echaremos de menos! 😞'
    );
  } catch {
    telegramBot.sendMessage(chatId, 'Ocurrió un error.');
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
      `💵 Precio venta: ${formatPrice(current.rate)} | ${trend}`
    );
  } catch {
    telegramBot.sendMessage(chatId, 'Ocurrió un error. xd');
  }
});

telegramBot.onText(/\/buy/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const [current, lastEntry] = await Promise.all([
      generateExchangeRateHistoryEntry('BUY'),
      getLastExchangeRateHistory(),
    ]);
    const trend = lastEntry ? formatTrend(current.rate, lastEntry.rate) : '';
    telegramBot.sendMessage(
      chatId,
      `💵 Precio compra: ${formatPrice(current.rate)} | ${trend}`
    );
  } catch {
    telegramBot.sendMessage(chatId, 'Ocurrió un error.');
  }
});

telegramBot.onText(/\/target (.+)/, async (msg: Message, match) => {
  const chatId = msg.chat.id;
  const price = parseFloat(match?.[1] ?? '');
  if (isNaN(price) || price <= 0) {
    telegramBot.sendMessage(chatId, 'Precio inválido. Uso: /target 7.20');
    return;
  }
  try {
    await updateUser(String(chatId), { targetPrice: price });
    telegramBot.sendMessage(
      chatId,
      `🎯 Precio objetivo: ${formatPrice(price)}`
    );
  } catch {
    telegramBot.sendMessage(chatId, 'Ocurrió un error.');
  }
});

telegramBot.onText(/\/cleartarget/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    await clearTargetPrice(String(chatId));
    telegramBot.sendMessage(chatId, '🎯 Precio objetivo eliminado.');
  } catch {
    telegramBot.sendMessage(chatId, 'Ocurrió un error.');
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
    telegramBot.sendMessage(
      msg.chat.id,
      [
        `👥 Suscriptores: ${count}`,
        lastEntry
          ? `📈 Último precio: ${formatPrice(lastEntry.rate)} (${getLocalDate(lastEntry.timestamp)})`
          : `📈 Sin datos`,
        lastAlert > 0
          ? `🔔 Última alerta: ${getLocalDate(lastAlert)}`
          : `🔔 Sin alertas enviadas`,
      ].join('\n')
    );
  } catch {
    telegramBot.sendMessage(msg.chat.id, 'Ocurrió un error.');
  }
});

// ─── Callback query handler ───────────────────────────────────────────────────

telegramBot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return;

  await telegramBot.answerCallbackQuery(query.id);

  const editMenu = (text: string, keyboard: object) =>
    telegramBot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard as any,
    });

  switch (query.data) {
    case 'main_menu': {
      const existing = await getUserByChatId(String(chatId));
      await editMenu(
        existing ? '¿Qué deseas hacer?' : 'Suscríbete para recibir alertas.',
        mainMenuKeyboard(!!existing)
      );
      break;
    }

    case 'subscribe': {
      try {
        await saveUser({
          chatId,
          alertStepEnabled: true,
          alertHighRateEnabled: true,
        });
        await editMenu(
          '✅ ¡Suscrito! Recibirás alertas de precio.',
          mainMenuKeyboard(true)
        );
      } catch (error: any) {
        await telegramBot.sendMessage(
          chatId,
          error.code === 11000 ? 'Ya estás suscrito.' : 'Ocurrió un error.'
        );
      }
      break;
    }

    case 'unsubscribe': {
      try {
        await deleteUser({
          chatId,
          alertStepEnabled: true,
          alertHighRateEnabled: true,
        });
        await editMenu(
          'Te dimos de baja. ¡Te echaremos de menos! 😞',
          mainMenuKeyboard(false)
        );
      } catch {
        await telegramBot.sendMessage(chatId, 'Ocurrió un error.');
      }
      break;
    }

    case 'check_sell': {
      try {
        const [current, lastEntry] = await Promise.all([
          generateExchangeRateHistoryEntry('SELL'),
          getLastExchangeRateHistory(),
        ]);
        const trend = lastEntry
          ? formatTrend(current.rate, lastEntry.rate)
          : '';
        await telegramBot.sendMessage(
          chatId,
          `💵 Precio venta: ${formatPrice(current.rate)} ${trend}`
        );
      } catch {
        await telegramBot.sendMessage(chatId, 'Ocurrió un error.');
      }
      break;
    }

    case 'check_buy': {
      try {
        const [current, lastEntry] = await Promise.all([
          generateExchangeRateHistoryEntry('BUY'),
          getLastExchangeRateHistory(),
        ]);
        const trend = lastEntry
          ? formatTrend(current.rate, lastEntry.rate)
          : '';
        await telegramBot.sendMessage(
          chatId,
          `💵 Precio compra: ${formatPrice(current.rate)} ${trend}`
        );
      } catch {
        await telegramBot.sendMessage(chatId, 'Ocurrió un error.');
      }
      break;
    }

    case 'settings': {
      const doc = await getUserByChatId(String(chatId));
      if (!doc) {
        await telegramBot.sendMessage(chatId, 'Primero debes suscribirte.');
        break;
      }
      await editMenu(
        '⚙️ Configuración',
        settingsMenuKeyboard(doc.toObject() as TelegramUser)
      );
      break;
    }

    case 'toggle_step': {
      const doc = await getUserByChatId(String(chatId));
      if (!doc) break;
      const current = doc.toObject() as TelegramUser;
      const updated = await updateUser(String(chatId), {
        alertStepEnabled: !(current.alertStepEnabled !== false),
      });
      if (updated) {
        await editMenu(
          '⚙️ Configuración',
          settingsMenuKeyboard(updated.toObject() as TelegramUser)
        );
      }
      break;
    }

    case 'toggle_high_rate': {
      const doc = await getUserByChatId(String(chatId));
      if (!doc) break;
      const current = doc.toObject() as TelegramUser;
      const updated = await updateUser(String(chatId), {
        alertHighRateEnabled: !(current.alertHighRateEnabled !== false),
      });
      if (updated) {
        await editMenu(
          '⚙️ Configuración',
          settingsMenuKeyboard(updated.toObject() as TelegramUser)
        );
      }
      break;
    }

    case 'sensitivity_menu': {
      const doc = await getUserByChatId(String(chatId));
      if (!doc) break;
      const user = doc.toObject() as TelegramUser;
      await editMenu(
        '📊 Sensibilidad de alertas de precio alto\n\nElige qué tan sensible deben ser las alertas Z-score:',
        sensitivityMenuKeyboard(user.alertSensitivity ?? 'media')
      );
      break;
    }

    case 'set_sensitivity_alta':
    case 'set_sensitivity_media':
    case 'set_sensitivity_baja': {
      const levelMap: Record<string, AlertSensitivity> = {
        set_sensitivity_alta: 'alta',
        set_sensitivity_media: 'media',
        set_sensitivity_baja: 'baja',
      };
      const newLevel = levelMap[query.data!];
      await updateUser(String(chatId), { alertSensitivity: newLevel });
      await editMenu(
        '📊 Sensibilidad de alertas de precio alto\n\nElige qué tan sensible deben ser las alertas Z-score:',
        sensitivityMenuKeyboard(newLevel)
      );
      break;
    }

    case 'set_target': {
      setState(chatId, 'AWAITING_TARGET_PRICE');
      await telegramBot.sendMessage(
        chatId,
        '🎯 Ingresa tu precio objetivo (ej: 7.20):'
      );
      break;
    }

    case 'clear_target': {
      await clearTargetPrice(String(chatId));
      const updatedDoc = await getUserByChatId(String(chatId));
      if (updatedDoc) {
        await editMenu(
          '⚙️ Configuración',
          settingsMenuKeyboard(updatedDoc.toObject() as TelegramUser)
        );
      }
      break;
    }
  }
});

// ─── Conversation state handler ───────────────────────────────────────────────

telegramBot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text || msg.text.startsWith('/')) return;

  if (getState(chatId) === 'AWAITING_TARGET_PRICE') {
    const price = parseFloat(msg.text);
    setState(chatId, 'IDLE');

    if (isNaN(price) || price <= 0) {
      telegramBot.sendMessage(
        chatId,
        '❌ Precio inválido. Ingresa un número como 7.20'
      );
      return;
    }
    try {
      await updateUser(String(chatId), { targetPrice: price });
      telegramBot.sendMessage(
        chatId,
        `✅ Precio objetivo establecido: ${formatPrice(price)}`
      );
    } catch {
      telegramBot.sendMessage(chatId, 'Ocurrió un error al guardar el precio.');
    }
  }
});
