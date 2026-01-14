import Redis from "ioredis";
import { config } from "./environment";
import { logger } from "../utils/logger";

export const createRedisClient = () => {
    const redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    redis.on('connect', () => { 
        logger.info('Redis connected successfully');
    });

    redis.on('error', (error) => {
        logger.error('Redis connection error', { error });
    });

    return redis;
};
