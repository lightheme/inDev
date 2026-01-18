import { runSchedulerTick } from '../../workers/scheduler';
import { runCleanupTick } from '../../workers/cleanup';
import { cleanupJobId, endRoundJobId } from '../../jobs/jobIds';
import { QueueClient } from '../../queue/redisQueue';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';

const createQueueMock = (): jest.Mocked<QueueClient> => ({
  enqueue: jest.fn(),
  popReady: jest.fn(),
  getPayload: jest.fn(),
  heartbeat: jest.fn(),
  ackSuccess: jest.fn(),
  failAndRetry: jest.fn(),
  tickDelayed: jest.fn(),
  recoverInflight: jest.fn(),
  disconnect: jest.fn(),
});

describe('scheduler tick', () => {
  it('enqueues end round job for due active round', async () => {
    const queue = createQueueMock();
    queue.tickDelayed.mockResolvedValue(0);
    queue.recoverInflight.mockResolvedValue(0);
    queue.enqueue.mockResolvedValue('enqueued');

    const now = Date.now();
    const auctionRepository = {
      findActive: jest.fn().mockResolvedValue([
        {
          _id: 'auction1',
          status: AuctionStatus.ACTIVE,
          currentRound: 0,
          rounds: [
            {
              status: RoundStatus.ACTIVE,
              endTime: new Date(now - 1000),
            },
          ],
        },
      ]),
    } as any;

    await runSchedulerTick({
      queue,
      auctionRepository,
      queueName: 'main',
      now,
      tickBatchSize: 10,
      inflightTimeoutMs: 1000,
      recoverBatchSize: 10,
    });

    expect(queue.enqueue).toHaveBeenCalledWith(
      'main',
      endRoundJobId('auction1', 0),
      expect.stringContaining('"END_ROUND"'),
      now,
    );
  });

  it('skips enqueue when round is not due', async () => {
    const queue = createQueueMock();
    queue.tickDelayed.mockResolvedValue(0);
    queue.recoverInflight.mockResolvedValue(0);

    const now = Date.now();
    const auctionRepository = {
      findActive: jest.fn().mockResolvedValue([
        {
          _id: 'auction1',
          status: AuctionStatus.ACTIVE,
          currentRound: 0,
          rounds: [
            {
              status: RoundStatus.ACTIVE,
              endTime: new Date(now + 1000),
            },
          ],
        },
      ]),
    } as any;

    await runSchedulerTick({
      queue,
      auctionRepository,
      queueName: 'main',
      now,
      tickBatchSize: 10,
      inflightTimeoutMs: 1000,
      recoverBatchSize: 10,
    });

    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});

describe('cleanup tick', () => {
  it('enqueues cleanup job for current bucket', async () => {
    const queue = createQueueMock();
    queue.enqueue.mockResolvedValue('enqueued');

    const now = 1_000_000;
    const bucketMs = 60_000;
    const bucket = Math.floor(now / bucketMs);

    await runCleanupTick({ queue, queueName: 'main', now, cleanupBucketMs: bucketMs });

    expect(queue.enqueue).toHaveBeenCalledWith(
      'main',
      cleanupJobId(bucket),
      expect.stringContaining('"BALANCE_CLEANUP"'),
      now,
    );
  });
});
