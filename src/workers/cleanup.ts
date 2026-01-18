import { connectDatabase } from '../config/database';
import { config } from '../config/environment';
import { createQueue } from '../queue/redisQueue';
import { cleanupJobId } from '../jobs/jobIds';
import { BalanceCleanupJobPayload } from '../jobs/types';
import { logger } from '../utils/logger';

const run = async () => {
  if (config.nodeEnv === 'test') {
    logger.info('Cleanup worker disabled in test environment');
    return;
  }

  await connectDatabase();

  const queue = createQueue();
  const queueName = config.queue.name;

  logger.info('Cleanup worker started', { queueName });

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const now = Date.now();
      const tickBucket = Math.floor(now / config.queue.cleanupBucketMs);
      const payload: BalanceCleanupJobPayload = {
        type: 'BALANCE_CLEANUP',
        tick: tickBucket,
        attempt: 0,
      };

      const jobId = cleanupJobId(tickBucket);
      const result = await queue.enqueue(queueName, jobId, JSON.stringify(payload), now);

      logger.info('Scheduled cleanup job', { jobId, result, tick: tickBucket });
    } catch (error: any) {
      logger.error('Cleanup tick failed', { error: error.message, stack: error.stack });
    } finally {
      running = false;
    }
  };

  await tick();
  setInterval(tick, config.queue.cleanupIntervalMs);
};

run().catch((error) => {
  logger.error('Cleanup worker crashed', { error: error.message, stack: error.stack });
  process.exit(1);
});
