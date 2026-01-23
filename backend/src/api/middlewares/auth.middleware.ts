import { Response, Request, NextFunction } from 'express';
import {
  validateTelegramInitData,
  TelegramInitDataValidationError,
} from '../../utils/telegram.util';
import { UserService } from '../../services/UserService';
import { UnauthorizedError } from '../../utils/errors';
import { verifyDevToken } from '../../utils/dev-auth.util';
import { config } from '../../config/environment';
import { logger } from '../../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        telegramId: string;
        username?: string;
        login?: string;
        role?: string;
      };
    }
  }
}

const userService = new UserService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;
    const isProduction = config.nodeEnv === 'production';

    if (authorization && authorization.startsWith('Bearer ')) {
      if (isProduction) {
        throw new UnauthorizedError('Bearer authentication is disabled in production');
      }

      const token = authorization.replace('Bearer ', '').trim();
      const payload = verifyDevToken(token);

      if (!payload) {
        throw new UnauthorizedError('Invalid bearer token');
      }

      const user = await userService.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedError('Invalid bearer token');
      }

      req.user = {
        id: user._id.toString(),
        telegramId: user.telegramId.toString(),
        username: user.username,
        login: payload.login,
        role: payload.role,
      };

      return next();
    }

    const initData = req.headers['x-telegram-init-data'] as string;

    if (!initData) {
      throw new UnauthorizedError('Missing x-telegram-init-data');
    }

    let telegramUser;
    try {
      telegramUser = validateTelegramInitData(initData);
    } catch (error) {
      if (error instanceof TelegramInitDataValidationError) {
        const snippet = `${initData.slice(0, 48)}${initData.length > 48 ? '…' : ''}`;
        logger.warn('Telegram initData validation failed', {
          reason: error.message,
          initDataSnippet: snippet,
          initDataLength: initData.length,
        });
        throw new UnauthorizedError(error.message);
      }
      throw error;
    }

    const user = await userService.getOrCreateUser({
      telegramId: telegramUser.telegramId,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
      lastName: telegramUser.lastName,
    });

    req.user = {
      id: user._id.toString(),
      telegramId: user.telegramId.toString(),
      username: user.username,
    };

    next();
  } catch (error) {
    next(error);
  }
};
