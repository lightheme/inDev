import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { AppError } from '../../utils/errors';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      
      const user = await this.userService.getUserById(userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.json({
        success: true,
        data: {
          id: user._id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
          reservedBalance: user.reservedBalance,
          availableBalance: user.balance - user.reservedBalance
        }
      });
    } catch (error) {
      next(error);
    }
  };

  topUpBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { amount } = req.body;
      
      const user = await this.userService.topUpBalance(userId, amount);
      
      res.json({
        success: true,
        data: {
          balance: user.balance,
          reservedBalance: user.reservedBalance,
          availableBalance: user.balance - user.reservedBalance
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
