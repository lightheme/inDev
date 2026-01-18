import { v4 as uuidv4 } from 'uuid';
import { connectDatabase } from '../config/database';
import { config } from '../config/environment';
import { createQueue } from '../queue/redisQueue';
import { JobPayload } from '../jobs/types';
import { handleEndRound } from '../jobs/handlers/endRound';
import { handleAutoBidTick } from '../jobs/handlers/autoBidTick';
import { handleBalanceCleanup } from '../jobs/handlers/cleanup';
import { logger } from '../utils/logger';

export const run = async () => {
  if (config.nodeEnv === 'test') {
    logger.info('Worker runner disabled in test environment');
    return;
  }

  await connectDatabase();

  const queue = createQueue();
  const workerId = uuidv4();
  const queueName = config.queue.name;

  logger.info('Worker runner started', { workerId, queueName });

  while (true) {
    const jobId = await queue.popReady(queueName, workerId, 5);
    if (!jobId) continue;

    const payloadJson = await queue.getPayload(queueName, jobId);
    if (!payloadJson) {
      logger.error('Job payload missing', { jobId, queueName });
      await queue.ackSuccess(queueName, jobId);
      continue;
    }

    let payload: JobPayload;
    try {
      payload = JSON.parse(payloadJson) as JobPayload;
    } catch (error) {
      logger.error('Failed to parse job payload', { jobId, payloadJson });
      await queue.ackSuccess(queueName, jobId);
      continue;
    }

    const startTime = Date.now();
    const attempt = payload.attempt ?? 0;
    const heartbeat = setInterval(() => {
      queue.heartbeat(queueName, jobId, workerId).catch((error) => {
        logger.error('Heartbeat failed', { jobId, error: error.message });
      });
    }, config.queue.heartbeatIntervalMs);

    try {
      logger.info('Job started', {
        jobId,
        type: payload.type,
        auctionId: 'auctionId' in payload ? payload.auctionId : undefined,
        roundNumber: 'roundNumber' in payload ? payload.roundNumber : undefined,
        attempt,
      });

      switch (payload.type) {
        case 'END_ROUND':
          await handleEndRound(payload);
          break;
        case 'AUTO_BID_TICK':
          await handleAutoBidTick(payload);
          break;
        case 'BALANCE_CLEANUP':
          await handleBalanceCleanup(payload);
          break;
        default:
          throw new Error(`Unknown job type: ${(payload as JobPayload).type}`);
      }

      await queue.ackSuccess(queueName, jobId);
      logger.info('Job succeeded', {
        jobId,
        type: payload.type,
        auctionId: 'auctionId' in payload ? payload.auctionId : undefined,
        roundNumber: 'roundNumber' in payload ? payload.roundNumber : undefined,
        attempt,
        durationMs: Date.now() - startTime,
      });
    } catch (error: any) {
      const nextAttempt = attempt + 1;
      const nextPayload = { ...payload, attempt: nextAttempt };
      const result = await queue.failAndRetry(
        queueName,
        jobId,
        JSON.stringify(nextPayload),
        error?.message || 'Unknown error',
        attempt,
        config.queue.jobMaxAttempts,
      );

      logger.error('Job failed', {
        jobId,
        type: payload.type,
        auctionId: 'auctionId' in payload ? payload.auctionId : undefined,
        roundNumber: 'roundNumber' in payload ? payload.roundNumber : undefined,
        attempt: nextAttempt,
        durationMs: Date.now() - startTime,
        error: error?.message,
        stack: error?.stack,
        result,
      });
    } finally {
      clearInterval(heartbeat);
    }
  }
};

run().catch((error) => {
  logger.error('Worker runner crashed', { error: error.message, stack: error.stack });
  process.exit(1);
});
