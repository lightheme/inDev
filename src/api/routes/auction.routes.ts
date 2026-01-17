import { Router } from 'express';
import { AuctionController } from '../controllers/auction.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import {
  createAuctionSchema,
  increaseBidSchema,
  placeBidSchema,
} from '../validators/auction.validator';

const router = Router();
const auctionController = new AuctionController();

router.post(
  '/auctions/create',
  authMiddleware,
  validateRequest(createAuctionSchema),
  auctionController.createAuction,
);

router.get('/auctions', auctionController.getAuctions);

router.get('/auctions/:id', auctionController.getAuctionById);

router.post(
  '/auctions/:id/place-bid',
  authMiddleware,
  validateRequest(placeBidSchema),
  auctionController.placeBid,
);

router.post(
  '/auctions/:id/increase-bid',
  authMiddleware,
  validateRequest(increaseBidSchema),
  auctionController.increaseBid,
);

router.get('/auctions/:id/leaderboard', auctionController.getLeaderboard);

export default router;
