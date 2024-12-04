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

const getUserByChatId = async (chatId: string): Promise<Document | null> => {
  return await TelegramUserModel.findOne({ chatId }).exec();
};

const getAllUsers = async (): Promise<Document[]> => {
  return await TelegramUserModel.find({}).exec();
};

const updateUser = async (
  chatId: string,
  updateData: Partial<TelegramUser>
): Promise<Document | null> => {
  return await TelegramUserModel.findOneAndUpdate({ chatId }, updateData, {
    new: true,
  }).exec();
};

const deleteUser = async (user: TelegramUser): Promise<Document | null> => {
  return await TelegramUserModel.findOneAndDelete({
    chatId: user.chatId,
  }).exec();
};

const TelegramUserService = {
  saveUser,
  getUserByChatId,
  getAllUsers,
  updateUser,
  deleteUser,
};

export default TelegramUserService;
