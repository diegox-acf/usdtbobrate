import telegramBot from '@config/telegramBot';
import TelegramUserModel, { TelegramUser } from '@models/telegramUser.model';
import { formatPrice } from '@utils/index';
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

export const updateUser = async (
  chatId: string,
  updateData: Partial<TelegramUser>
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOneAndUpdate({ chatId }, updateData, {
    new: true,
  }).exec();
};

export const deleteUser = async (
  user: TelegramUser
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOneAndDelete({
    chatId: user.chatId,
  }).exec();
};

export const sendAlerts = async (highRate: number, message = '') => {
  logger.info(
    `High rate detected: ${highRate}. Sending alerts to subscribed users...`
  );
  const docs = await getAllUsers();
  const subscribedUsers = docs.map((doc) => doc.toObject());
  subscribedUsers.forEach((subscribedUser) => {
    telegramBot.sendMessage(
      subscribedUser.chatId,
      message ? message : `Alerta de precio alto: ${formatPrice(highRate)}`
    );
  });
};
