import { Router } from "express";
import { AuctionController } from "../controllers/auction.controller";

const router = Router();
const auctionController = new AuctionController();

router.post(
    '/auctions/create',
//  authMiddleware,
//  validateRequest(createAuctionSchema)
    auctionController.createAuction 
);

router.get('/auctions', auctionController.getAuctions);

router.get('/auctions/:id', auctionController.getAuctionById);

router.post(
    '/auctions/:id/place-bid',
//  authMiddleware,
//  validateRequest(createAuctionSchema)
    auctionController.placeBid 
);

router.post(
    '/auctions/:id/increase-bid',
//  authMiddleware,
//  validateRequest(createAuctionSchema)
    auctionController.increaseBid  
);

export default router;
