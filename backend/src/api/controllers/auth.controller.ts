import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../utils/errors';
import { issueAuthToken } from '../../utils/auth.util';
import { hashPassword, verifyPassword } from '../../utils/password.util';
import { UserRepository } from '../../repositories/UserRepository';

export class AuthController {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { login, password } = req.body as {
        login: string;
        password: string;
      };

      const normalizedLogin = login.trim().toLowerCase();

      let user = await this.userRepository.findByLogin(normalizedLogin);

      if (!user) {
        const passwordHash = await hashPassword(password);
        user = await this.userRepository.create({
          login: normalizedLogin,
          passwordHash,
          role: 'user',
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
      });

      res.json({
        success: true,
        data: {
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
