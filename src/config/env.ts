import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  HOST: z.string().default('localhost'),
  MONGODB_URI: z.string().min(1, 'Missing MongoDB URI'),
  NODE_ENV: z.enum(['prod', 'dev']).default('dev'),
  LOG_LEVEL: z.string().default('info'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'Missing Telegram Bot Token'),
});

const { success, error, data } = envSchema.safeParse(process.env);

if (!success) {
  console.error('❌ Error when reading environment variables:', error.format());
  process.exit(1);
}

export const {
  PORT,
  MONGODB_URI,
  NODE_ENV,
  LOG_LEVEL,
  TELEGRAM_BOT_TOKEN,
  HOST,
} = data;
