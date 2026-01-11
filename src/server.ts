import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { config } from "./config/environment";
import { logger } from "./utils/logger";
import { AuctionModel } from "./models/Auctions.model";
import { UserModel } from "./models/User.model";

const startServer = async () => {
    try {
        await connectDatabase();
        // START TEST
       const user = await UserModel.findOne({ telegramId: 12345 });

        const auction = new AuctionModel({
            creatorId: user!._id,
            title: 'test',
            totalGifts: 10,
            rounds: [         
                {
                    roundNumber: 1,
                    giftsToDistribute: 3,
                    duration: 60,
                    status: 'pending',
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000)
                }
            ]
        });

        await auction.save();
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
