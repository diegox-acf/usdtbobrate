import client from '@config/client';
import ExchangeRateModel, { ExchangeRate } from '@models/exchangeRate.model';
import {
  formatPrice,
  getExchangeRateQueryData,
  getLocalDate,
  TradeType,
} from '@utils/index';
import logger from '@utils/logger';

export const getExchangeRateHistory = async (): Promise<ExchangeRate[]> => {
  return await ExchangeRateModel.find();
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

export const checkHigh = async () => {
  const entries = await ExchangeRateModel.find()
    .sort({ timestamp: -1 })
    .limit(5);
  console.log('🚀 ~ checkHigh ~ entries:', entries);
  entries.map((entry) => {
    console.log(`${entry.rate} on ${getLocalDate(entry.timestamp)}`);
  });
};

// checkHigh();
