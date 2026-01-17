import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      'mongodb://admin:password@localhost:27017/auction?authSource=admin',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
};
