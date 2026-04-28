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
  const lastExchangeRate = await ExchangeRateModel.findOne()
    .sort({ timestamp: -1 })
    .exec();
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

export const calculatePrevNext = (
  value: number
): { prev: number; next: number } => {
  // Use integer math to avoid floating-point issues (e.g. 6.9/0.1 = 68.999...)
  const prevInt = Math.floor(Math.round(value * 100) / 10);
  return { prev: prevInt / 10, next: (prevInt + 1) / 10 };
};

export const checkUpperStepReached = (current: number): boolean => {
  const { next } = getPrevNextStep();
  setPrevNextStep(calculatePrevNext(current));
  return current >= next;
};

// Exported for unit testing — Kadane's algorithm on newest-first rate array
export const computeMaxIncrease = (rates: number[]): number => {
  let maxIncrease = 0;
  let running = 0;
  for (let i = rates.length - 1; i > 0; i--) {
    const diff = rates[i - 1] - rates[i]; // newer - older (positive when price rises)
    running = Math.max(0, running + diff);
    maxIncrease = Math.max(maxIncrease, running);
  }
  return maxIncrease;
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

  if (docs.length < 2) return null;

  // rates[0] = newest, rates[n-1] = oldest
  const rates = docs.map((doc) => doc.rate);
  logger.debug(`rates: ${rates}`);

  const maxIncrease = computeMaxIncrease(rates);
  logger.debug(`maxIncrease: ${maxIncrease}`);
  if (maxIncrease >= threshold) {
    return rates[0]; // return the current (newest) rate
  }
  return null;
};
