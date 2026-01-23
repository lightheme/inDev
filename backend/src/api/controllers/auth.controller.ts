import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { AppError, UnauthorizedError } from '../../utils/errors';
import {
  findDevAuthUser,
  issueDevToken,
  resolveDevUserTelegramId,
} from '../../utils/dev-auth.util';
import { config } from '../../config/environment';
import { issueAuthToken } from '../../utils/auth.util';
import { hashPassword, verifyPassword } from '../../utils/password.util';
import { UserRepository } from '../../repositories/UserRepository';

const buildSafeUser = (user: {
  _id: string;
  telegramId?: number;
  login?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  reservedBalance: number;
}) => ({
  id: user._id,
  telegramId: user.telegramId ?? null,
  login: user.login,
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  balance: user.balance,
  reservedBalance: user.reservedBalance,
  availableBalance: user.balance - user.reservedBalance,
});

export class AuthController {
  private userService: UserService;
  private userRepository: UserRepository;

  constructor() {
    this.userService = new UserService();
    this.userRepository = new UserRepository();
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
          login: undefined,
          email: undefined,
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

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { login, email, password } = req.body as {
        login?: string;
        email?: string;
        password: string;
      };

      const normalizedLogin = login?.trim().toLowerCase();
      const normalizedEmail = email?.trim().toLowerCase();

      let user = await this.userRepository.findByLoginOrEmail(
        normalizedLogin,
        normalizedEmail,
      );

      if (!user) {
        const passwordHash = await hashPassword(password);
        user = await this.userRepository.create({
          login: normalizedLogin,
          email: normalizedEmail,
          passwordHash,
        });
      } else {
        if (!user.passwordHash) {
          throw new UnauthorizedError('Invalid login or password');
        }

        const passwordOk = await verifyPassword(password, user.passwordHash);
        if (!passwordOk) {
          throw new UnauthorizedError('Invalid login or password');
        }
      }

      const token = issueAuthToken({
        sub: user._id.toString(),
        login: user.login,
        email: user.email,
      });

      res.json({
        token,
        user: buildSafeUser({
          _id: user._id.toString(),
          telegramId: user.telegramId,
          login: user.login,
          email: user.email,
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
