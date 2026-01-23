import { Request, Response, NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { CommandHandler } from '../../commands/CommandHandler';
import { CreateAuctionCommand } from '../../commands/auction/CreateAuctionCommand';
import { PlaceBidCommand } from '../../commands/bid/PlaceBidCommand';
import { IncreaseBidCommand } from '../../commands/bid/IncreaseBidCommand';
import { AuctionService } from '../../services/AuctionService';
import { AppError } from '../../utils/errors';

export class AuctionController {
  private commandHandler: CommandHandler;
  private auctionService: AuctionService;

  constructor() {
    this.commandHandler = new CommandHandler();
    this.auctionService = new AuctionService();
  }

  private getQueryString(
    value: string | string[] | ParsedQs | ParsedQs[] | undefined,
  ): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      const [first] = value;
      return typeof first === 'string' ? first : undefined;
    }
    return undefined;
  }

  private getQueryNumber(
    value: string | string[] | ParsedQs | ParsedQs[] | undefined,
  ): number | undefined {
    const queryValue = this.getQueryString(value);
    if (!queryValue) {
      return undefined;
    }
    const parsed = Number(queryValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getHeaderString(value: string | string[] | undefined): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value[0];
    }
    return undefined;
  }

  createAuction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const idempotencyKey = this.getHeaderString(req.headers['idempotency-key']);

      if (!idempotencyKey) {
        throw new AppError('Idempotency-Key header is required for POST operations', 400);
      }

      const command = new CreateAuctionCommand({
        ...req.body,
        creatorId: userId,
        idempotencyKey,
      });

      const result = await this.commandHandler.execute(command);

      if (!result.success) {
        throw new AppError(result.error || 'Failed to create auction', 400);
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  getAuctions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = this.getQueryString(req.query.status);
      const page = this.getQueryNumber(req.query.page);
      const limit = this.getQueryNumber(req.query.limit);

      const auctions = await this.auctionService.getAuctions({
        status,
        page,
        limit,
      });

      res.json({
        success: true,
        data: auctions,
      });
    } catch (error) {
      next(error);
    }
  };

  getAuctionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const auction = await this.auctionService.getAuctionById(id);

      if (!auction) {
        throw new AppError('Auction not found', 404);
      }

      res.json({
        success: true,
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  };

  placeBid = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { id: auctionId } = req.params;
      const { amount } = req.body;
      const idempotencyKey = this.getHeaderString(req.headers['idempotency-key']);

      if (!idempotencyKey) {
        throw new AppError('Idempotency-Key header is required for POST operations', 400);
      }

      const command = new PlaceBidCommand({
        auctionId,
        userId,
        amount,
        idempotencyKey,
      });

      const result = await this.commandHandler.execute(command);

      if (!result.success) {
        throw new AppError(result.error || 'Failed to place bid', 400);
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  increaseBid = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { id: auctionId } = req.params;
      const { amount, bidId } = req.body;
      const idempotencyKey = this.getHeaderString(req.headers['idempotency-key']);

      if (!idempotencyKey) {
        throw new AppError('Idempotency-Key header is required for POST operations', 400);
      }

      const command = new IncreaseBidCommand({
        bidId,
        auctionId,
        userId,
        amount,
        idempotencyKey,
      });

      const result = await this.commandHandler.execute(command);

      if (!result.success) {
        throw new AppError(result.error || 'Failed to increase bid', 400);
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: auctionId } = req.params;
      const roundNumber = this.getQueryNumber(req.query.round) ?? 1;

      const leaderboard = await this.auctionService.getLeaderboard(auctionId, roundNumber);

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  };
}
