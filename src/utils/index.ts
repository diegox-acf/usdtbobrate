export type TradeType = 'SELL' | 'BUY';

export const getExchangeRateQueryData = (tradeType: TradeType) => {
  return {
    fiat: 'BOB',
    page: 1,
    rows: 5,
    tradeType: tradeType,
    asset: 'USDT',
    countries: [],
    proMerchantAds: false,
    shieldMerchantAds: false,
    filterType: 'all',
    periods: [],
    additionalKycVerifyFilter: 0,
    publisherType: 'merchant',
    payTypes: [],
    classifies: ['mass', 'profession', 'fiat_trade'],
  };
};

export const getLocalDate = (timestamp: number): string => {
  const gmtOffset = -4; // GMT-4 for Bolivia

  // Convert the timestamp to a Date object
  const date = new Date(timestamp);

  // Apply the GMT offset manually
  const utc = date.getTime() + date.getTimezoneOffset() * 60000; // Convert to UTC
  const localTime = new Date(utc + gmtOffset * 3600000); // Apply offset

  // Format the date manually
  const formattedDate = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate()).padStart(2, '0')} ${String(localTime.getHours()).padStart(2, '0')}:${String(localTime.getMinutes()).padStart(2, '0')}:${String(localTime.getSeconds()).padStart(2, '0')}`;
  return formattedDate;
};

export const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

export const getMean = (data: number[]): number => {
  const sum = data.reduce((acc, value) => acc + value, 0);
  return sum / data.length;
};

export const getStandardDeviation = (data: number[]): number => {
  const mean = getMean(data);
  const squareDiffSum = data.reduce(
    (acc, value) => acc + Math.pow(value - mean, 2),
    0
  );
  return Math.sqrt(squareDiffSum / data.length);
};

export const round = (value: number, scale: number = 2): number => {
  const digits = Math.pow(10, scale);
  return Math.round(value * digits) / digits;
};

export const formatTrend = (current: number, previous: number): string => {
  const diff = round(current - previous, 2);
  if (diff > 0) return `↑ +${formatPrice(diff)}`;
  if (diff < 0) return `↓ ${formatPrice(diff)}`;
  return `→ ${formatPrice(0)}`;
};
