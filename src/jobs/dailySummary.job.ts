import { properties } from '@config/properties';
import { getDailySellRates } from '@services/exchangeRate.service';
import { sendAlerts } from '@services/telegramUser.service';
import { formatPrice, getMean, round } from '@utils/index';
import logger from '@utils/logger';
import cron from 'node-cron';

export const startDailySummaryJob = () => {
  cron.schedule(properties.job.dailySummaryCron, async () => {
    logger.info('Daily summary job started');
    try {
      const rates = await getDailySellRates();

      if (rates.length === 0) {
        logger.info('Daily summary: no SELL data for the past 24h');
        return;
      }

      const high = Math.max(...rates);
      const low = Math.min(...rates);
      const avg = round(getMean(rates), 2);

      const message =
        `📊 Resumen diario USDT/BOB\n` +
        `📈 Max: ${formatPrice(high)}\n` +
        `📉 Min: ${formatPrice(low)}\n` +
        `➡️  Promedio: ${formatPrice(avg)}`;

      await sendAlerts(message);
    } catch (error) {
      logger.error('Daily summary job failed', error);
    }
  });
};
