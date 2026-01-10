import mongoose from "mongoose";
import { config } from "./environment";
import { logger } from "../utils/logger";

export const connectDatabase = async () => {
    try {
        await mongoose.connect(config.mongodb.uri);
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('MongoDB connection error: ', { error: error });
        process.exit(1);
    }
}
