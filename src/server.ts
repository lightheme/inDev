import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { config } from "./config/environment";
import { logger } from "./utils/logger";

const startServer = async () => {
    try {
        await connectDatabase();
        // START TEST
        // const user = await UserModel.findOne({ telegramId: 12345 });
//        const user = new UserModel({
//            telegramId: 12345,
//            username: 'test',
//            balance: 100
//        });
//        await user.save();
//
//        const auction = new AuctionModel({
//            creatorId: user!._id,
//            title: 'test',
//            totalGifts: 10,
//            rounds: [         
//                {
//                    roundNumber: 1,
//                    giftsToDistribute: 3,
//                    duration: 60,
//                    status: 'pending',
//                    startTime: new Date(),
//                    endTime: new Date(Date.now() + 3600000)
//                }
//            ]
//        });
//
//        await auction.save();
//
//        const bid = new BidModel({
//            auctionId: auction._id,
//            userId: user!._id,
//            roundNumber: 1,
//            amount: 1,
//            idempotencyKey: "12345"
//        });
//
//        const ledgerEntry = new LedgerModel({
//            userId: user._id,
//            type: 'reserve',
//            amount: 1,
//            refType: 'round',
//            refId: bid._id,
//            commandId: "123445"
//        });
//        
//        await ledgerEntry.save();
//        await bid.save();
        // END TEST

        const app = createApp();

        app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port}`);
        });
    } catch(error) {
        logger.error('Failed to start server: ', { error });
        process.exit(1)
    }
};

startServer()
