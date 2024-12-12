import telegramBot from '@config/telegramBot';
import TelegramUserModel, { TelegramUser } from '@models/telegramUser.model';
import logger from '@utils/logger';
import { Document } from 'mongoose';

const saveUser = async (userData: TelegramUser): Promise<void> => {
  const telegramUser = new TelegramUserModel(userData);
  await telegramUser.save();
  logger.info(
    `Telegram user with chatId: ${userData.chatId} created successfully`
  );
};

const getUserByChatId = async (
  chatId: string
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOne({ chatId }).exec();
};

const getAllUsers = async (): Promise<
  Document<unknown, {}, TelegramUser>[]
> => {
  return await TelegramUserModel.find({}).exec();
};

const updateUser = async (
  chatId: string,
  updateData: Partial<TelegramUser>
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOneAndUpdate({ chatId }, updateData, {
    new: true,
  }).exec();
};

const deleteUser = async (
  user: TelegramUser
): Promise<Document<unknown, {}, TelegramUser> | null> => {
  return await TelegramUserModel.findOneAndDelete({
    chatId: user.chatId,
  }).exec();
};

const sendAlerts = async (highRate: number) => {
  logger.info(
    `High rate detected: ${highRate}. Sending alerts to subscribed users...`
  );
  const docs = await getAllUsers();
  const subscribedUsers = docs.map((doc) => doc.toObject());
  subscribedUsers.forEach((subscribedUser) => {
    telegramBot.sendMessage(
      subscribedUser.chatId,
      `Alerta de precio alto: ${highRate}`
    );
  });
};

const TelegramUserService = {
  saveUser,
  getUserByChatId,
  getAllUsers,
  updateUser,
  deleteUser,
  sendAlerts,
};

export default TelegramUserService;
