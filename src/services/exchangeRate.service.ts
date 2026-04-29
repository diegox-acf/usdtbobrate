import client from '@config/client';
import { properties } from '@config/properties';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import {
  formatPrice,
  getExchangeRateQueryData,
  getLocalDate,
  getMean,
  getStandardDeviation,
  round,
  TradeType,
} from '@utils/index';
import logger from '@utils/logger';

export const getLastExchangeRateHistory = async (): Promise<ExchangeRate | null> => {
  const doc = await ExchangeRateModel.findOne({ tradeType: 'SELL' })
    .sort({ timestamp: -1 })
    .exec();
  return doc ?? null;
};

export const getExchangeRateHistory = async (): Promise<ExchangeRate[]> => {
  return await ExchangeRateModel.find().exec();
};

export const getDailySellRates = async (): Promise<number[]> => {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const docs = await ExchangeRateModel.find({
    tradeType: 'SELL',
    timestamp: { $gte: since },
  }).exec();
  return docs.map((doc) => doc.rate);
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
    tradeType,
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

// Returns true when current rate has moved into a higher 0.1-unit step than previous
export const stepCrossed = (current: number, previous: number): boolean => {
  const toStep = (v: number) => Math.floor(Math.round(v * 100) / 10);
  return toStep(current) > toStep(previous);
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

// Exported for unit testing — Z-score of current rate against historical window
export const computeZScore = (current: number, historical: number[]): number => {
  if (historical.length < 2) return 0;
  const mean = getMean(historical);
  const stddev = getStandardDeviation(historical);
  if (stddev === 0) return 0;
  return (current - mean) / stddev;
};

export const checkHighExchangeRateZScore = async (): Promise<number | null> => {
  const threshold = properties.exchangeRate.zscoreThreshold;
  const windowSize = properties.exchangeRate.zscoreWindowSize;
  logger.debug(`zscore windowSize: ${windowSize}, threshold: ${threshold}`);

  // Fetch one extra so we have windowSize historical points after separating current
  const docs = await ExchangeRateModel.find({ tradeType: 'SELL' })
    .sort({ timestamp: -1 })
    .limit(windowSize + 1)
    .exec();

  if (docs.length < 3) return null;

  const rates = docs.map((doc) => doc.rate);
  const current = rates[0];
  const historical = rates.slice(1); // exclude current from the baseline

  const zScore = computeZScore(current, historical);
  logger.debug(`zScore: ${zScore.toFixed(3)}, mean: ${getMean(historical).toFixed(3)}, stddev: ${getStandardDeviation(historical).toFixed(3)}`);

  return zScore >= threshold ? current : null;
};

export const checkHighExchangeRateIncrease = async (): Promise<
  number | null
> => {
  const threshold = properties.exchangeRate.threshold;
  const windowSize = properties.exchangeRate.rateWindowSize;
  logger.debug(`windowSize: ${windowSize}`);

  const docs = await ExchangeRateModel.find({ tradeType: 'SELL' })
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
