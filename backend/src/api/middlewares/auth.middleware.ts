import { Response, Request, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { UnauthorizedError } from '../../utils/errors';
import { verifyAuthToken } from '../../utils/auth.util';
import { config } from '../../config/environment';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
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
        username: user.username,
        login: authPayload.login,
        email: authPayload.email,
      };

      return next();
    }

    throw new UnauthorizedError('Invalid bearer token');
  } catch (error) {
    next(error);
  }
};
