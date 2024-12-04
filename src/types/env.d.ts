declare namespace NodeJS {
  export interface ProcessEnv {
    PORT?: string;
    MONGODB_URI: string;
    NODE_ENV: string;
    LOG_LEVEL: string;
    TELEGRAM_BOT_TOKEN: string;
  }
}
