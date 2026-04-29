import { isOnCooldown, markAlertSent } from '@config/alertCooldown';
import { properties } from '@config/properties';
import {
  checkHighExchangeRateIncrease,
  checkHighExchangeRateZScore,
  generateExchangeRateHistoryEntry,
  getLastExchangeRateHistory,
  saveExchangeRateEntry,
  stepCrossed,
} from '@services/exchangeRate.service';
import {
  clearTargetPrice,
  getUsersWithTargetPrice,
  sendAlerts,
  sendMessageToUser,
} from '@services/telegramUser.service';
import { formatPrice, formatTrend, getLocalDate } from '@utils/index';
import logger from '@utils/logger';
import cron from 'node-cron';

const detectHighRate = async (): Promise<number | null> => {
  const algorithm = properties.exchangeRate.alertAlgorithm;
  if (algorithm === 'kadane') return checkHighExchangeRateIncrease();
  if (algorithm === 'zscore') return checkHighExchangeRateZScore();
  const [kadane, zscore] = await Promise.all([
    checkHighExchangeRateIncrease(),
    checkHighExchangeRateZScore(),
  ]);
  return kadane ?? zscore;
};

export const startJobScheduler = () => {
  cron.schedule(properties.job.cronExpression, async () => {
    logger.info(`Cron tick started on ${getLocalDate(new Date().getTime())}`);
    try {
      const lastEntry = await getLastExchangeRateHistory();

      const [sellEntry, buyEntry] = await Promise.all([
        generateExchangeRateHistoryEntry('SELL'),
        generateExchangeRateHistoryEntry('BUY'),
      ]);

      await Promise.all([
        saveExchangeRateEntry(sellEntry),
        saveExchangeRateEntry(buyEntry),
      ]);

      const trend = lastEntry ? formatTrend(sellEntry.rate, lastEntry.rate) : '';
      const cooldownMs = properties.job.alertCooldownMs;

      if (!isOnCooldown(cooldownMs)) {
        const highRate = await detectHighRate();
        if (highRate) {
          await sendAlerts(`Alerta de precio alto: ${formatPrice(highRate)} ${trend}`);
          markAlertSent();
        } else if (lastEntry !== null && stepCrossed(sellEntry.rate, lastEntry.rate)) {
          await sendAlerts(`El precio llego a ${formatPrice(sellEntry.rate)} ${trend}`);
          markAlertSent();
        }
      } else {
        logger.info('Alert suppressed: cooldown active');
      }

      // Target price alerts are always checked, regardless of cooldown
      const targetUsers = await getUsersWithTargetPrice();
      await Promise.all(
        targetUsers
          .map((doc) => doc.toObject())
          .filter((user) => user.targetPrice !== undefined && sellEntry.rate >= user.targetPrice)
          .map(async (user) => {
            await sendMessageToUser(
              user.chatId,
              `🎯 Precio objetivo alcanzado: ${formatPrice(sellEntry.rate)} ${trend}`
            );
            await clearTargetPrice(String(user.chatId));
          })
      );
    } catch (error) {
      logger.error('Cron tick failed', error);
    }
  });
};
