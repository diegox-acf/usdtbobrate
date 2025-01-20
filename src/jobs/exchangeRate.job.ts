import { properties } from '@config/properties';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import {
  checkHighExchangeRateIncrease,
  checkUpperStepReached,
  generateExchangeRateHistoryEntry,
} from '@services/exchangeRate.service';

import { sendAlerts } from '@services/telegramUser.service';
import { getLocalDate } from '@utils/index';
import logger from '@utils/logger';
import cron from 'node-cron';

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

    const highExchangeRate = await checkHighExchangeRateIncrease();
    if (highExchangeRate) {
      sendAlerts(highExchangeRate);
    }
    const stepReached = checkUpperStepReached(exchangeRateEntry.rate);
    if (stepReached) {
      sendAlerts(exchangeRateEntry.rate);
    }
  });
};
