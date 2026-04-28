import { properties } from '@config/properties';
import { ExchangeRate } from '@models/exchangeRate.model';
import {
  checkHighExchangeRateIncrease,
  checkUpperStepReached,
  generateExchangeRateHistoryEntry,
  saveExchangeRateEntry,
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

    await saveExchangeRateEntry(exchangeRateEntry);

    const highExchangeRate = await checkHighExchangeRateIncrease();
    if (highExchangeRate) {
      sendAlerts(highExchangeRate);
    }
    const stepReached = checkUpperStepReached(exchangeRateEntry.rate);
    if (stepReached) {
      const message = `El precio llego a ${exchangeRateEntry.rate}`;
      sendAlerts(exchangeRateEntry.rate, message);
    }
  });
};
