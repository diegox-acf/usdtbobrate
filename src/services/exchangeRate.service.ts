import client from '@config/client';
import { properties } from '@config/properties';
import { getPrevNextStep, setPrevNextStep } from '@config/step';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import {
  formatPrice,
  getExchangeRateQueryData,
  getLocalDate,
  round,
  TradeType,
} from '@utils/index';
import logger from '@utils/logger';

export const getLastExchangeRateHistory = async (): Promise<ExchangeRate> => {
  const lastExchangeRate = await ExchangeRateModel.findOne().exec();
  if (!lastExchangeRate) {
    throw new Error('Exchange rate history not found');
  }
  return lastExchangeRate;
};

export const getStepRates = async (): Promise<{
  prev: number;
  next: number;
}> => {
  const lastEntry = await getLastExchangeRateHistory();
  const lastRate = lastEntry.rate;
  return calculatePrevNext(lastRate);
};

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

  const exchangeRatePrice = round(exchangeRatePriceSum / prices.length);

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

export const checkUpperStepReached = (current: number): boolean => {
  const { prev, next } = getPrevNextStep();
  setPrevNextStep(calculatePrevNext(current));
  return current > next;
};

export const calculatePrevNext = (
  value: number
): { prev: number; next: number } => {
  const prev = Math.floor(value / 0.25) * 0.25;
  let next = Math.ceil(value / 0.25) * 0.25;

  if (value === prev) {
    next = next + 0.25;
  }
  return { prev, next };
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
