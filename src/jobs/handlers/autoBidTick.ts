import { AuctionRepository } from '../../repositories/AuctionRepository';
import { BidRepository } from '../../repositories/BidRepository';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';
import { AutoBidTickJobPayload } from '../types';
import { PlaceBidCommand } from '../../commands/bid/PlaceBidCommand';
import { IncreaseBidCommand } from '../../commands/bid/IncreaseBidCommand';
import { autoBidIdempotencyKey } from '../jobIds';
import { createRedisClient } from '../../queue/redisClient';
import { config } from '../../config/environment';
import { AppError } from '../../utils/errors';

const redis = createRedisClient();
const AUTOBID_INCREMENT = 10;

export const handleAutoBidTick = async (payload: AutoBidTickJobPayload): Promise<void> => {
  const { auctionId, roundNumber, botUserId } = payload;
  const auctionRepository = new AuctionRepository();
  const bidRepository = new BidRepository();

  const auction = await auctionRepository.findById(auctionId);
  if (!auction || auction.status !== AuctionStatus.ACTIVE) return;

  if (roundNumber < 0 || roundNumber >= auction.rounds.length) return;

  if (auction.currentRound !== roundNumber) return;

  const round = auction.rounds[roundNumber];
  if (!round || round.status !== RoundStatus.ACTIVE) return;

  const minuteBucket = Math.floor(Date.now() / 60000);
  const rateLimitKey = `autobid:rl:${auctionId}:${minuteBucket}`;
  const rate = await redis.incr(rateLimitKey);
  if (rate === 1) {
    await redis.expire(rateLimitKey, 60);
  }
  if (rate > config.queue.autobidMaxPerMinutePerAuction) return;

  const idempotencyKey = autoBidIdempotencyKey(auctionId, roundNumber, botUserId, payload.tick);
  const existingBids = await bidRepository.findActiveByUserRound(
    botUserId,
    auctionId,
    roundNumber,
  );

  if (existingBids.length > 0) {
    const bid = existingBids[0];
    const command = new IncreaseBidCommand({
      bidId: bid._id.toString(),
      auctionId,
      userId: botUserId,
      amount: AUTOBID_INCREMENT,
      idempotencyKey,
    });

    try {
      await command.validate();
      await command.execute();
    } catch (error: any) {
      if (error instanceof AppError) return;
      throw error;
    }

    return;
  }

  const command = new PlaceBidCommand({
    auctionId,
    userId: botUserId,
    amount: AUTOBID_INCREMENT,
    idempotencyKey,
  });

  try {
    await command.validate();
    await command.execute();
  } catch (error: any) {
    if (error instanceof AppError) return;
    throw error;
  }
};
