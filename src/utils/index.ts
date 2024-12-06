export type TradeType = 'SELL' | 'BUY';

export const getExchangeRateQueryData = (tradeType: TradeType) => {
  return {
    fiat: 'BOB',
    page: 1,
    rows: 10,
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
