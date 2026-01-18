import { connectDatabase } from '../config/database';
import { config } from '../config/environment';
import { AuctionRepository } from '../repositories/AuctionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AuctionStatus, RoundStatus } from '../types/auction.types';
import { createQueue } from '../queue/redisQueue';
import { autoBidJobId } from '../jobs/jobIds';
import { AutoBidTickJobPayload } from '../jobs/types';
import { logger } from '../utils/logger';
import { BalanceManager } from '../core/BalanceManager';
import { LedgerRefType } from '../types/ledger.types';

const BOT_PREFIX = 'bot_auto_';
const BOT_COUNT = 3;
const BOT_BALANCE = 1000;

const ensureBotUsers = async (): Promise<string[]> => {
  const userRepository = new UserRepository();
  const balanceManager = new BalanceManager();
  const existingBots = await userRepository.findByUsernamePrefix(BOT_PREFIX);

  const botIds: string[] = existingBots.map((bot) => bot._id.toString());

  for (let i = existingBots.length; i < BOT_COUNT; i += 1) {
    const telegramId = 9_000_000_000 + i;
    const username = `${BOT_PREFIX}${i + 1}`;
    const bot = await userRepository.create({
      telegramId,
      username,
      firstName: 'Auto',
      lastName: 'Bid',
      balance: 0,
      reservedBalance: 0,
    });

    const botId = bot._id.toString();
    await balanceManager.topup({
      userId: botId,
      amount: BOT_BALANCE,
      refType: LedgerRefType.USER,
      refId: botId,
      commandId: `cmd:autobid:bootstrap:${botId}`,
    });

    botIds.push(botId);
  }

  return botIds.slice(0, BOT_COUNT);
};

const run = async () => {
  if (config.nodeEnv === 'test') {
    logger.info('Autobid worker disabled in test environment');
    return;
  }

  if (!config.queue.autobidEnabled) {
    logger.info('Autobid worker disabled by configuration');
    return;
  }

  await connectDatabase();

  const queue = createQueue();
  const queueName = config.queue.name;
  const auctionRepository = new AuctionRepository();
  const botIds = await ensureBotUsers();

  logger.info('Autobid worker started', { queueName, botCount: botIds.length });

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const auctions = await auctionRepository.findActive();
      const now = Date.now();
      const tickBucket = Math.floor(now / config.queue.autobidBucketMs);

      for (const auction of auctions) {
        if (auction.status !== AuctionStatus.ACTIVE) continue;
        const roundNumber = auction.currentRound;
        const round = auction.rounds[roundNumber];
        if (!round || round.status !== RoundStatus.ACTIVE) continue;

        for (const botUserId of botIds) {
          const payload: AutoBidTickJobPayload = {
            type: 'AUTO_BID_TICK',
            auctionId: auction._id.toString(),
            roundNumber,
            botUserId,
            tick: tickBucket,
            attempt: 0,
          };

          const jobId = autoBidJobId(
            payload.auctionId,
            payload.roundNumber,
            payload.botUserId,
            payload.tick,
          );
          const jitterMs = Math.floor(Math.random() * 500);
          const result = await queue.enqueue(queueName, jobId, JSON.stringify(payload), now + jitterMs);

          logger.info('Scheduled autobid tick', {
            jobId,
            auctionId: payload.auctionId,
            roundNumber: payload.roundNumber,
            botUserId: payload.botUserId,
            result,
          });
        }
      }
    } catch (error: any) {
      logger.error('Autobid tick failed', { error: error.message, stack: error.stack });
    } finally {
      running = false;
    }
  };

  await tick();
  setInterval(tick, config.queue.autobidPollIntervalMs);
};

run().catch((error) => {
  logger.error('Autobid worker crashed', { error: error.message, stack: error.stack });
  process.exit(1);
});
