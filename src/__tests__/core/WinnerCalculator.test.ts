import { WinnerCalculator } from '../../core/WinnerCalculator';
import { TestHelpers } from '../helpers/test-helpers';
import { BidStatus } from '../../types/bid.types';
import mongoose from 'mongoose';
import { BidRepository } from '../../repositories/BidRepository';

describe('WinnerCalculator', () => {
  let winnerCalculator: WinnerCalculator;
  let auctionId: mongoose.Types.ObjectId;
  let users: any[];
  let bidRepository: BidRepository;

  beforeEach(async () => {
    winnerCalculator = new WinnerCalculator();
    auctionId = new mongoose.Types.ObjectId();
    bidRepository = new BidRepository();

    // Create test users
    users = [
      await TestHelpers.createUser({ telegramId: 1, balance: 1000 }),
      await TestHelpers.createUser({ telegramId: 2, balance: 1000 }),
      await TestHelpers.createUser({ telegramId: 3, balance: 1000 }),
      await TestHelpers.createUser({ telegramId: 4, balance: 1000 }),
    ];
  });

  describe('calculateWinners', () => {
    it('should select winners based on highest total bid amount', async () => {
      const roundNumber = 1;

      // User 1: 3 bids totaling 500
      await TestHelpers.createBid({
        auctionId,
        userId: users[0]._id,
        roundNumber,
        amount: 200,
      });
      await TestHelpers.createBid({
        auctionId,
        userId: users[0]._id,
        roundNumber,
        amount: 200,
      });
      await TestHelpers.createBid({
        auctionId,
        userId: users[0]._id,
        roundNumber,
        amount: 100,
      });

      // User 2: 2 bids totaling 400
      await TestHelpers.createBid({
        auctionId,
        userId: users[1]._id,
        roundNumber,
        amount: 250,
      });
      await TestHelpers.createBid({
        auctionId,
        userId: users[1]._id,
        roundNumber,
        amount: 150,
      });

      // User 3: 1 bid totaling 300
      await TestHelpers.createBid({
        auctionId,
        userId: users[2]._id,
        roundNumber,
        amount: 300,
      });

      // User 4: 1 bid totaling 100
      await TestHelpers.createBid({
        auctionId,
        userId: users[3]._id,
        roundNumber,
        amount: 100,
      });

      const winners = await winnerCalculator.calculateWinners(
        auctionId.toString(),
        roundNumber,
        2, // 2 gifts to distribute
      );

      expect(winners.length).toBe(2);
      expect(winners[0].userId).toBe(users[0]._id.toString()); // User 1: 500 total
      expect(winners[0].amount).toBe(500);
      expect(winners[1].userId).toBe(users[1]._id.toString()); // User 2: 400 total
      expect(winners[1].amount).toBe(400);
    });

    it('should use earliest bid as tie-breaker when amounts are equal', async () => {
      const roundNumber = 1;
      const baseTime = Date.now();

      // User 1: bid at time 0
      await TestHelpers.createBid({
        auctionId,
        userId: users[0]._id,
        roundNumber,
        amount: 200,
      });
      // Manually set earlier placedAt
      await bidRepository.updatePlacedAtForUserRound(
        auctionId.toString(),
        users[0]._id.toString(),
        roundNumber,
        new Date(baseTime),
      );

      // User 2: bid at time 1000 (later)
      await TestHelpers.createBid({
        auctionId,
        userId: users[1]._id,
        roundNumber,
        amount: 200,
      });
      await bidRepository.updatePlacedAtForUserRound(
        auctionId.toString(),
        users[1]._id.toString(),
        roundNumber,
        new Date(baseTime + 1000),
      );

      const winners = await winnerCalculator.calculateWinners(auctionId.toString(), roundNumber, 1);

      expect(winners.length).toBe(1);
      expect(winners[0].userId).toBe(users[0]._id.toString()); // User 1 wins due to earlier bid
    });

    it('should handle case where winners count exceeds participants', async () => {
      const roundNumber = 1;

      await TestHelpers.createBid({
        auctionId,
        userId: users[0]._id,
        roundNumber,
        amount: 100,
      });
      await TestHelpers.createBid({
        auctionId,
        userId: users[1]._id,
        roundNumber,
        amount: 200,
      });

      const winners = await winnerCalculator.calculateWinners(
        auctionId.toString(),
        roundNumber,
        10, // More gifts than participants
      );

      expect(winners.length).toBe(2); // Only 2 participants
    });

    it('should return empty array if no bids', async () => {
      const winners = await winnerCalculator.calculateWinners(auctionId.toString(), 1, 5);

      expect(winners.length).toBe(0);
    });

    it('should only consider ACTIVE bids', async () => {
      const roundNumber = 1;

      // Active bid
      await TestHelpers.createBid({
        auctionId,
        userId: users[0]._id,
        roundNumber,
        amount: 200,
        status: BidStatus.ACTIVE,
      });

      // Won bid (should be ignored)
      await TestHelpers.createBid({
        auctionId,
        userId: users[1]._id,
        roundNumber,
        amount: 300,
        status: BidStatus.WON,
      });

      // Refunded bid (should be ignored)
      await TestHelpers.createBid({
        auctionId,
        userId: users[2]._id,
        roundNumber,
        amount: 400,
        status: BidStatus.REFUNDED,
      });

      const winners = await winnerCalculator.calculateWinners(auctionId.toString(), roundNumber, 1);

      expect(winners.length).toBe(1);
      expect(winners[0].userId).toBe(users[0]._id.toString());
    });
  });

  describe('getRanking', () => {
    it('should return ranking sorted by total amount', async () => {
      const roundNumber = 1;

      await TestHelpers.createBid({
        auctionId,
        userId: users[0]._id,
        roundNumber,
        amount: 100,
      });
      await TestHelpers.createBid({
        auctionId,
        userId: users[1]._id,
        roundNumber,
        amount: 200,
      });
      await TestHelpers.createBid({
        auctionId,
        userId: users[2]._id,
        roundNumber,
        amount: 150,
      });

      const ranking = await winnerCalculator.getRanking(auctionId.toString(), roundNumber);

      expect(ranking.length).toBe(3);
      expect(ranking[0].rank).toBe(1);
      expect(ranking[0].userId).toBe(users[1]._id.toString()); // 200
      expect(ranking[1].rank).toBe(2);
      expect(ranking[1].userId).toBe(users[2]._id.toString()); // 150
      expect(ranking[2].rank).toBe(3);
      expect(ranking[2].userId).toBe(users[0]._id.toString()); // 100
    });
  });
});
