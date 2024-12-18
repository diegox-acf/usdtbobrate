import client from '@config/client';
import { properties } from '@config/properties';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import {
  formatPrice,
  getExchangeRateQueryData,
  getLocalDate,
  getMean,
  getStandardDeviation,
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
    .map((item: any) => +item.adv.price);
  logger.debug(`List of prices on ${new Date().toISOString()}: ${prices}`);
  const exchangeRatePriceSum = prices.reduce(
    (acc: any, cur: any) => acc + cur,
    0
  );
  const exchangeRatePrice = exchangeRatePriceSum / prices.length;
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

export const checkHigh = async (): Promise<number | null> => {
  const k = properties.app.rateK;
  logger.debug(`k: ${k}`);
  const windowSize = properties.app.rateWindowSize;
  logger.debug(`windowSize: ${windowSize}`);
  const docs = await ExchangeRateModel.find()
    .sort({ timestamp: -1 })
    .limit(windowSize)
    .exec();
  const entries = docs.map((doc) => doc.toObject());
  const rates: number[] = entries.map((entry) => entry.rate);
  logger.debug(`rates: ${rates}`);
  const currentPrice = rates.pop()!;
  logger.debug(`currentPrice: ${currentPrice}`);
  const mean = getMean(rates);
  logger.debug(`mean: ${mean}`);
  const standardDeviation = getStandardDeviation(rates);
  logger.debug(`standardDeviation: ${standardDeviation}`);
  const threshold = mean + k * standardDeviation;
  logger.debug(`threshold: ${k}`);
  return currentPrice > threshold ? currentPrice : null;
};
