import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { LedgerService } from '../../ledger/LedgerService';
import { AppError } from '../../utils/errors';

export class UserController {
  private userService: UserService;
  private ledgerService: LedgerService;

  constructor() {
    this.userService = new UserService();
    this.ledgerService = new LedgerService();
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
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
          reservedBalance: user.reservedBalance,
          availableBalance: user.balance - user.reservedBalance,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  topUpBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { amount } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;

      if (!idempotencyKey) {
        throw new AppError('Idempotency-Key header is required for POST operations', 400);
      }

      const user = await this.userService.topUpBalance(userId, amount, idempotencyKey);

      res.json({
        success: true,
        data: {
          balance: user.balance,
          reservedBalance: user.reservedBalance,
          availableBalance: user.balance - user.reservedBalance,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const entries = await this.ledgerService.getUserLedger(userId, limit);

      res.json({
        success: true,
        data: entries.map((entry) => ({
          id: entry._id.toString(),
          userId: entry.userId.toString(),
          type: entry.type,
          amount: entry.amount,
          refType: entry.refType,
          refId: entry.refId.toString(),
          commandId: entry.commandId,
          createdAt: entry.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  };
}
