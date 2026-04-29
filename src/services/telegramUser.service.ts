import telegramBot from '@config/telegramBot';
import TelegramUserModel, { TelegramUser } from '@models/telegramUser.model';
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

export const sendAlerts = async (message: string): Promise<void> => {
  logger.info(`Sending alerts to subscribed users: ${message}`);
  const docs = await getAllUsers();
  const users = docs.map((doc) => doc.toObject());
  await Promise.all(users.map((user) => telegramBot.sendMessage(user.chatId, message)));
};
