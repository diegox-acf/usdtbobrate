import telegramBot from '@config/telegramBot';
import TelegramUserModel, { SENSITIVITY_THRESHOLDS, TelegramUser } from '@models/telegramUser.model';
import logger from '@utils/logger';
import { Document } from 'mongoose';

export const saveUser = async (userData: TelegramUser): Promise<void> => {
  const telegramUser = new TelegramUserModel(userData);
  await telegramUser.save();
  logger.info(
    `Telegram user with chatId: ${userData.chatId} created successfully`
  );
};

export const getUserByChatId = async (
  chatId: string
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOne({ chatId }).exec();
};

export const getAllUsers = async (): Promise<
  Document<unknown, {}, TelegramUser>[]
> => {
  return await TelegramUserModel.find({}).exec();
};

export const getUserCount = async (): Promise<number> => {
  return TelegramUserModel.countDocuments().exec();
};

export const getUsersWithTargetPrice = async (): Promise<
  Document<unknown, {}, TelegramUser>[]
> => {
  return TelegramUserModel.find({
    targetPrice: { $exists: true, $ne: null },
  }).exec();
};

export const updateUser = async (
  chatId: string,
  updateData: Partial<TelegramUser>
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOneAndUpdate({ chatId }, updateData, {
    new: true,
  }).exec();
};

export const clearTargetPrice = async (chatId: string): Promise<void> => {
  await TelegramUserModel.findOneAndUpdate(
    { chatId },
    { $unset: { targetPrice: 1 } }
  ).exec();
};

export const deleteUser = async (
  user: TelegramUser
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOneAndDelete({
    chatId: user.chatId,
  }).exec();
};

export const sendMessageToUser = async (
  chatId: number,
  message: string
): Promise<void> => {
  await telegramBot.sendMessage(chatId, message);
};

export const sendHighRateAlertsPerUser = async (
  message: string,
  rawZScore: number | null,
  kadaneTriggered: boolean,
): Promise<void> => {
  logger.info(`Sending per-user high-rate alert: ${message}`);
  const docs = await TelegramUserModel.find({ alertHighRateEnabled: { $ne: false } }).exec();
  await Promise.all(
    docs.map((doc) => {
      const user = doc.toObject() as TelegramUser;
      const threshold = SENSITIVITY_THRESHOLDS[user.alertSensitivity ?? 'media'];
      const fires = kadaneTriggered || (rawZScore !== null && rawZScore >= threshold);
      return fires ? telegramBot.sendMessage(user.chatId, message) : Promise.resolve();
    })
  );
};

export type AlertType = 'highRate' | 'step';

export const sendAlerts = async (message: string, type?: AlertType): Promise<void> => {
  logger.info(`Sending ${type ?? 'broadcast'} alert: ${message}`);
  let docs;
  if (type === 'step') {
    docs = await TelegramUserModel.find({ alertStepEnabled: { $ne: false } }).exec();
  } else if (type === 'highRate') {
    docs = await TelegramUserModel.find({ alertHighRateEnabled: { $ne: false } }).exec();
  } else {
    docs = await getAllUsers();
  }
  const users = docs.map((doc) => doc.toObject());
  await Promise.all(users.map((user) => telegramBot.sendMessage(user.chatId, message)));
};
