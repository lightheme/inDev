import { BalanceManager } from '../../core/BalanceManager';
import { AuctionRepository } from '../../repositories/AuctionRepository';
import { BidRepository } from '../../repositories/BidRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';
import { LedgerRefType } from '../../types/ledger.types';
import { cleanupCommandId } from '../jobIds';
import { BalanceCleanupJobPayload } from '../types';

export const handleBalanceCleanup = async (payload: BalanceCleanupJobPayload): Promise<void> => {
  const auctionRepository = new AuctionRepository();
  const bidRepository = new BidRepository();
  const userRepository = new UserRepository();
  const balanceManager = new BalanceManager();

  const activeAuctions = await auctionRepository.findActive();
  const activeRounds = activeAuctions
    .filter((auction) => auction.status === AuctionStatus.ACTIVE)
    .map((auction) => ({
      auctionId: auction._id.toString(),
      roundNumber: auction.currentRound,
      round: auction.rounds[auction.currentRound],
    }))
    .filter((entry) => entry.round && entry.round.status === RoundStatus.ACTIVE)
    .map((entry) => ({ auctionId: entry.auctionId, roundNumber: entry.roundNumber }));

  const users = await userRepository.findWithReservedBalance(0);

  for (const user of users) {
    const userId = user._id.toString();
    const activeBids = await bidRepository.findActiveByUserInRounds(userId, activeRounds);
    if (activeBids.length > 0) continue;

    const reservedBalance = Number(user.reservedBalance);
    if (reservedBalance <= 0) continue;

    const commandId = cleanupCommandId(payload.tick, userId, 'reserved');
    await balanceManager.release({
      userId,
      amount: reservedBalance,
      refType: LedgerRefType.USER,
      refId: userId,
      commandId,
    });
  }
};
