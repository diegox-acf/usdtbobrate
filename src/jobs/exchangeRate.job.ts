import {
  checkHigh,
  generateExchangeRateHistoryEntry,
} from '@services/exchangeRate.service';
import logger from '@utils/logger';
import cron from 'node-cron';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import { getLocalDate } from '@utils/index';
import { properties } from '@config/properties';
import TelegramUserService from '@services/telegramUser.service';
export const startJobScheduler = () => {
  cron.schedule(properties.job.cronExpression, async () => {
    logger.info(
      `Generating exchangeRate history entry on ${getLocalDate(new Date().getTime())}`
    );
    const exchangeRateEntry: ExchangeRate =
      await generateExchangeRateHistoryEntry('SELL');
    const newExchangeRateEntry = new ExchangeRateModel(exchangeRateEntry);
    await newExchangeRateEntry.save();
    logger.info('Exchange rate entry generated and saved succesfully');
    const highRate = await checkHigh();
    if (highRate) {
      TelegramUserService.sendAlerts(highRate);
    }
  });
};
