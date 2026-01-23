import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import auctionRoutes from './api/routes/auction.routes';
import userRoutes from './api/routes/user.routes';
import authRoutes from './api/routes/auth.routes';
import { errorMiddleware } from './api/middlewares/error.middleware';
import { logger } from './utils/logger';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  const allowedOrigins = (process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.length === 0) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-init-data', 'Idempotency-Key'],
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', userRoutes);
  app.use('/api', authRoutes);
  app.use('/api', auctionRoutes);

  app.use(errorMiddleware);

  return app;
};
