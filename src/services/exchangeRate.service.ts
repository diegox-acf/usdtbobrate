import client from '@config/client';
import { properties } from '@config/properties';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import {
  formatPrice,
  getExchangeRateQueryData,
  getLocalDate,
  getMean,
  getStandardDeviation,
  round2Decimals,
  TradeType,
} from '@utils/index';
import logger from '@utils/logger';

export const getExchangeRateHistory = async (): Promise<ExchangeRate[]> => {
  return await ExchangeRateModel.find().exec();
};

export const generateExchangeRateHistoryEntry = async (
  tradeType: TradeType = 'SELL'
): Promise<ExchangeRate> => {
  const response = await client.post('/', getExchangeRateQueryData(tradeType));

  const prices = response.data.data
    .filter((item: any) => item.advertiser.monthOrderCount > 0)
    .map((item: any) => +item.adv.price) as number[];
  logger.debug(`List of prices on ${new Date().toISOString()}: ${prices}`);

  const exchangeRatePriceSum = prices.reduce<number>(
    (acc: any, cur: any) => acc + cur,
    0
  );

  const exchangeRatePrice = round2Decimals(
    exchangeRatePriceSum / prices.length
  );

  const exchangeRate: ExchangeRate = {
    rate: exchangeRatePrice,
    timestamp: new Date().getTime(),
  };
  logger.info(
    `Exchange rate entry with price: ${formatPrice(exchangeRate.rate)} generated on ${getLocalDate(exchangeRate.timestamp)}`
  );
  return exchangeRate;
};

export const saveExchangeRateEntry = async (
  exchangeRateEntry: ExchangeRate
): Promise<void> => {
  const exchangeRate = new ExchangeRateModel(exchangeRateEntry);
  await exchangeRate.save();
  logger.info(`Exchange Rate entry saved successfully`);
};

export const checkHighExchangeRateIncrease = async (): Promise<
  number | null
> => {
  const threshold = properties.exchangeRate.threshold;
  const windowSize = properties.exchangeRate.rateWindowSize;
  logger.debug(`windowSize: ${windowSize}`);
  const docs = await ExchangeRateModel.find()
    .sort({ timestamp: -1 })
    .limit(windowSize)
    .exec();
  const entries = docs.map((doc) => doc.toObject());
  const rates: number[] = entries.map((entry) => entry.rate);

  logger.debug(`rates: ${rates}`);
  let acc = 0;
  let max = -1;
  let first = true;
  for (let i = rates.length - 1; i > 0; i--) {
    const diff = rates[i] - rates[i - 1];
    if (acc + diff > 0) {
      acc = acc + diff;
      max = Math.max(acc, max);
    } else {
      acc = 0;
      if (first) {
        return null;
      }
    }
    first = false;
    if (max > threshold) {
      logger.debug(`max: ${max}`);
      return rates[rates.length - 1];
    }
  }
  return null;
};
