import { Response, Request, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { UnauthorizedError } from '../../utils/errors';
import { verifyDevToken } from '../../utils/dev-auth.util';
import { verifyAuthToken } from '../../utils/auth.util';
import { config } from '../../config/environment';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        telegramId: string;
        username?: string;
        login?: string;
        email?: string;
        role?: string;
      };
    }
  }
}

const userService = new UserService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing Authorization header');
    }

    const token = authorization.replace('Bearer ', '').trim();
    const authPayload = verifyAuthToken(token);

    if (authPayload) {
      const user = await userService.getUserById(authPayload.sub);
      if (!user) {
        throw new UnauthorizedError('Invalid bearer token');
      }

      req.user = {
        id: user._id.toString(),
        telegramId: user.telegramId?.toString() ?? '',
        username: user.username,
        login: authPayload.login,
        email: authPayload.email,
      };

      return next();
    }

    if (config.nodeEnv !== 'production') {
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
        telegramId: user.telegramId?.toString() ?? '',
        username: user.username,
        login: payload.login,
        role: payload.role,
      };

      return next();
    }

    throw new UnauthorizedError('Invalid bearer token');
  } catch (error) {
    next(error);
  }
};
