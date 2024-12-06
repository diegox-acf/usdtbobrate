import { generateExchangeRateHistoryEntry } from '@services/exchangeRate.service';
import logger from '@utils/logger';
import cron from 'node-cron';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import { getLocalDate } from '@utils/index';
import { properties } from '@config/properties';

export const startJobScheduler = () => {
  cron.schedule(properties.job.cronExpresion, async () => {
    logger.info(
      `Generating exchangeRate history entry on ${getLocalDate(new Date().getTime())}`
    );
    const exchangeRateEntry: ExchangeRate =
      await generateExchangeRateHistoryEntry('SELL');
    const newExchangeRateEntry = new ExchangeRateModel(exchangeRateEntry);
    newExchangeRateEntry.save();
    logger.info('Exchange rate entry generated and saved succesfully');
  });
};
