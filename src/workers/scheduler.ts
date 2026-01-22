import { connectDatabase } from '../config/database';
import { config } from '../config/environment';
import { AuctionRepository } from '../repositories/AuctionRepository';
import { AuctionStatus, RoundStatus } from '../types/auction.types';
import { createQueue, QueueClient } from '../queue/redisQueue';
import { endRoundJobId } from '../jobs/jobIds';
import { EndRoundJobPayload } from '../jobs/types';
import { logger } from '../utils/logger';

export const runSchedulerTick = async ({
  queue,
  auctionRepository,
  queueName,
  now = Date.now(),
  tickBatchSize = config.queue.tickBatchSize,
  inflightTimeoutMs = config.queue.inflightTimeoutMs,
  recoverBatchSize = config.queue.recoverBatchSize,
}: {
  queue: QueueClient;
  auctionRepository: AuctionRepository;
  queueName: string;
  now?: number;
  tickBatchSize?: number;
  inflightTimeoutMs?: number;
  recoverBatchSize?: number;
}): Promise<void> => {
  await queue.tickDelayed(queueName, tickBatchSize);
  await queue.recoverInflight(queueName, inflightTimeoutMs, recoverBatchSize);

  const auctions = await auctionRepository.findActive();

  for (const auction of auctions) {
    if (auction.status !== AuctionStatus.ACTIVE) continue;
    const roundNumber = auction.currentRound;
    const round = auction.rounds[roundNumber];
    if (!round || round.status !== RoundStatus.ACTIVE) continue;
    if (round.endTime.getTime() > now) continue;

    const payload: EndRoundJobPayload = {
      type: 'END_ROUND',
      auctionId: auction._id.toString(),
      roundNumber,
      attempt: 0,
    };

    const jobId = endRoundJobId(payload.auctionId, payload.roundNumber);
    const result = await queue.enqueue(queueName, jobId, JSON.stringify(payload), now);

    logger.info('Scheduled end round', {
      jobId,
      auctionId: payload.auctionId,
      roundNumber: payload.roundNumber,
      result,
    });
  }
};
export const run = async () => {
  if (config.nodeEnv === 'test') {
    logger.info('Scheduler disabled in test environment');
    return;
  }

  await connectDatabase();

  const queue = createQueue();
  const queueName = config.queue.name;
  const auctionRepository = new AuctionRepository();

  logger.info('Scheduler started', { queueName });

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runSchedulerTick({
        queue,
        auctionRepository,
        queueName,
        now: Date.now(),
      });
    } catch (error: any) {
      logger.error('Scheduler tick failed', { error: error.message, stack: error.stack });
    } finally {
      running = false;
    }
  };

  await tick();
  setInterval(tick, config.queue.schedulerIntervalMs);
};

if (require.main === module) {
  run().catch((error) => {
    logger.error('Scheduler crashed', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}
