import express, { Application } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import auctionRoutes from './api/routes/auction.routes';
import userRoutes from './api/routes/user.routes';
import authRoutes from './api/routes/auth.routes';
import { errorMiddleware } from './api/middlewares/error.middleware';
import { logger } from './utils/logger';

const normalizeOrigin = (o: string) => o.trim().replace(/\/$/, '').toLowerCase();

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  const raw = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const allowed = new Set(raw.map(normalizeOrigin));

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Запросы без Origin (curl/postman) — пропускаем
      if (!origin) return callback(null, true);

      // Если список не задан — в dev можно разрешить всем (или убери это, если хочешь строго)
      if (allowed.size === 0) return callback(null, true);

      const o = normalizeOrigin(origin);
      // ВАЖНО: не Error, а false
      return callback(null, allowed.has(o));
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-telegram-init-data',
      'Idempotency-Key',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
  };

  // CORS должен стоять до роутов
  app.use(cors(corsOptions));
  // Явная обработка preflight для всех путей
  app.options(/.*/, cors(corsOptions));
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
