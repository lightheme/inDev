import { AuctionEngine } from '../../core/AuctionEngine';
import { AuctionRepository } from '../../repositories/AuctionRepository';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';
import { endRoundCommandId } from '../jobIds';
import { EndRoundJobPayload } from '../types';

export const handleEndRound = async (payload: EndRoundJobPayload): Promise<void> => {
  const { auctionId, roundNumber } = payload;
  const auctionRepository = new AuctionRepository();
  const auctionEngine = new AuctionEngine();

  const auction = await auctionRepository.findById(auctionId);
  if (!auction) return;

  if (auction.status !== AuctionStatus.ACTIVE) return;

  if (roundNumber < 0 || roundNumber >= auction.rounds.length) return;

  const round = auction.rounds[roundNumber];
  if (!round || round.status !== RoundStatus.ACTIVE) return;

  if (round.endTime.getTime() > Date.now()) {
    throw new Error('Round not due yet');
  }

  await auctionEngine.endRound(auctionId, roundNumber, endRoundCommandId(auctionId, roundNumber));
};
