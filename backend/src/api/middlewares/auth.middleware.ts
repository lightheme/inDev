import { Response, Request, NextFunction } from 'express';
import { validateTelegramInitData } from '../../utils/telegram.util';
import { UserService } from '../../services/UserService';
import { UnauthorizedError } from '../../utils/errors';
import { verifyDevToken } from '../../utils/dev-auth.util';

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

    if (authorization && authorization.startsWith('Bearer ')) {
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
      throw new UnauthorizedError('Unauthorized');
    }

    const telegramUser = validateTelegramInitData(initData);

    if (!telegramUser) {
      throw new UnauthorizedError('Invalid Telegram init data');
    }

    const user = await userService.getOrCreateUser(telegramUser);

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
