import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { createRedisClient } from '../config/redis';

export class LockManager {
  private redis: Redis;
  private lockPrefix = 'lock:';

  constructor() {
    this.redis = createRedisClient();
  }

  async acquireLock(key: string, ttl: number = 10_000): Promise<boolean> {
    const lockKey = this.lockPrefix + key;
    const lockValue = `${Date.now()}-${Math.random()}`;

    try {
      const result = await this.redis.set(lockKey, lockValue, 'PX', ttl, 'NX');

      if (result === 'OK') {
        logger.debug(`Lock acquired: ${lockKey}`);
        return true;
      }

      logger.debug(`Failed to acquire lock: ${lockKey}`);
      return false;
    } catch (error: any) {
      logger.error(`Error acquiring lock: ${lockKey}`);
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    const lockKey = this.lockPrefix + key;

    try {
      await this.redis.del(lockKey);
      logger.debug(`Lock released: ${lockKey}`);
    } catch (error: any) {
      logger.error(`Error releasing lock: ${lockKey}`, { error: error.message });
    }
  }

  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.lockPrefix + key;
    const exist = await this.redis.exists(lockKey);
    return exist === 1;
  }
}
