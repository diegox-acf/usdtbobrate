import { createLogger, format, transports } from 'winston';

const nodeEnv = process.env.NODE_ENV || 'dev';
const logger = createLogger({
  level: nodeEnv === 'prod' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-DD-MM HH:mm:ss',
    }),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/app.log' }),
  ],
});

export default logger;
