import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { AppError, UnauthorizedError } from '../../utils/errors';
import {
  findDevAuthUser,
  issueDevToken,
  resolveDevUserTelegramId,
} from '../../utils/dev-auth.util';
import { config } from '../../config/environment';

const buildSafeUser = (user: {
  _id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  reservedBalance: number;
}) => ({
  id: user._id,
  telegramId: user.telegramId,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  balance: user.balance,
  reservedBalance: user.reservedBalance,
  availableBalance: user.balance - user.reservedBalance,
});

export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  devLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (config.nodeEnv === 'production') {
        throw new AppError('Not found', 404);
      }

      const { login, password } = req.body as { login: string; password: string };
      const devUser = findDevAuthUser(login, password);

      if (!devUser) {
        throw new UnauthorizedError('Invalid login or password');
      }

      const telegramId = resolveDevUserTelegramId(devUser);
      const user = await this.userService.getOrCreateDevUser({
        telegramId,
        username: devUser.username || devUser.login,
        firstName: devUser.firstName,
        lastName: devUser.lastName,
      });

      const token = issueDevToken({
        sub: user._id.toString(),
        login: devUser.login,
        role: devUser.role,
      });

      res.json({
        token,
        user: buildSafeUser({
          _id: user._id.toString(),
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
          reservedBalance: user.reservedBalance,
        }),
      });
    } catch (error) {
      next(error);
    }
  };
}
