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
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
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
