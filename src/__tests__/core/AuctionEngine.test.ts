import { AuctionEngine } from '../../core/AuctionEngine';
import { TestHelpers } from '../helpers/test-helpers';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';
import { BidStatus } from '../../types/bid.types';
import { AuctionRepository } from '../../repositories/AuctionRepository';
import { BidRepository } from '../../repositories/BidRepository';
import { UserRepository } from '../../repositories/UserRepository';

describe('AuctionEngine', () => {
  let auctionEngine: AuctionEngine;
  let creator: any;
  let users: any[];
  let auctionRepository: AuctionRepository;
  let bidRepository: BidRepository;
  let userRepository: UserRepository;

  beforeEach(async () => {
    auctionEngine = new AuctionEngine();
    creator = await TestHelpers.createUser({ telegramId: 999, balance: 1000 });
    users = [
      await TestHelpers.createUser({ telegramId: 1, balance: 1000 }),
      await TestHelpers.createUser({ telegramId: 2, balance: 1000 }),
      await TestHelpers.createUser({ telegramId: 3, balance: 1000 }),
    ];
    auctionRepository = new AuctionRepository();
    bidRepository = new BidRepository();
    userRepository = new UserRepository();
  });

  describe('endRound', () => {
    it('should end round and charge winners, release losers', async () => {
      const auction = await TestHelpers.createAuction({
        creatorId: creator._id,
        status: AuctionStatus.ACTIVE,
        currentRound: 0,
        rounds: [
          {
            roundNumber: 1,
            giftsToDistribute: 2,
            startTime: new Date(Date.now() - 1000),
            endTime: new Date(Date.now() - 100),
            duration: 60,
            status: RoundStatus.ACTIVE,
            winnerIds: [],
          },
        ],
      });

      // Create bids
      const winner1Bid = await TestHelpers.createBid({
        auctionId: auction._id,
        userId: users[0]._id,
        roundNumber: 1,
        amount: 300,
        status: BidStatus.ACTIVE,
      });

      const winner2Bid = await TestHelpers.createBid({
        auctionId: auction._id,
        userId: users[1]._id,
        roundNumber: 1,
        amount: 200,
        status: BidStatus.ACTIVE,
      });

      const loserBid = await TestHelpers.createBid({
        auctionId: auction._id,
        userId: users[2]._id,
        roundNumber: 1,
        amount: 100,
        status: BidStatus.ACTIVE,
      });

      // Reserve balances for bids (simulating what happens when bids are placed)
      const reserveCommandId1 = TestHelpers.generateIdempotencyKey();
      const reserveCommandId2 = TestHelpers.generateIdempotencyKey();
      const reserveCommandId3 = TestHelpers.generateIdempotencyKey();

      // We need to manually reserve balances to simulate the bid placement flow
      // In real flow, PlaceBidCommand does this, but for testing we'll do it manually
      const { BalanceManager } = await import('../../core/BalanceManager');
      const balanceManager = new BalanceManager();

      await balanceManager.reserve({
        userId: users[0]._id.toString(),
        amount: 300,
        refType: 'bid' as any,
        refId: winner1Bid._id.toString(),
        commandId: reserveCommandId1,
      });

      await balanceManager.reserve({
        userId: users[1]._id.toString(),
        amount: 200,
        refType: 'bid' as any,
        refId: winner2Bid._id.toString(),
        commandId: reserveCommandId2,
      });

      await balanceManager.reserve({
        userId: users[2]._id.toString(),
        amount: 100,
        refType: 'bid' as any,
        refId: loserBid._id.toString(),
        commandId: reserveCommandId3,
      });

      // Verify initial state
      let user1 = await userRepository.findById(users[0]._id.toString());
      let user2 = await userRepository.findById(users[1]._id.toString());
      let user3 = await userRepository.findById(users[2]._id.toString());

      expect(user1!.reservedBalance).toBe(300);
      expect(user2!.reservedBalance).toBe(200);
      expect(user3!.reservedBalance).toBe(100);

      // End the round
      const commandId = TestHelpers.generateIdempotencyKey();
      await auctionEngine.endRound(auction._id.toString(), 0, commandId);

      // Verify round status
      const updatedAuction = await auctionRepository.findById(auction._id.toString());
      expect(updatedAuction!.rounds[0].status).toBe(RoundStatus.COMPLETED);
      expect(updatedAuction!.rounds[0].winnerIds.length).toBe(2);

      // Verify bid statuses
      const updatedWinner1Bid = await bidRepository.findById(winner1Bid._id.toString());
      const updatedWinner2Bid = await bidRepository.findById(winner2Bid._id.toString());
      const updatedLoserBid = await bidRepository.findById(loserBid._id.toString());

      expect(updatedWinner1Bid!.status).toBe(BidStatus.WON);
      expect(updatedWinner2Bid!.status).toBe(BidStatus.WON);
      expect(updatedLoserBid!.status).toBe(BidStatus.REFUNDED);

      // Verify balance changes
      user1 = await userRepository.findById(users[0]._id.toString());
      user2 = await userRepository.findById(users[1]._id.toString());
      user3 = await userRepository.findById(users[2]._id.toString());

      // Winners: balance charged (deducted), reservedBalance reduced
      expect(user1!.balance).toBe(700); // 1000 - 300
      expect(user1!.reservedBalance).toBe(0); // 300 - 300 (charged)
      expect(user2!.balance).toBe(800); // 1000 - 200
      expect(user2!.reservedBalance).toBe(0); // 200 - 200 (charged)

      // Loser: balance unchanged, reservedBalance released
      expect(user3!.balance).toBe(1000); // Unchanged
      expect(user3!.reservedBalance).toBe(0); // 100 - 100 (released)
    });

    it('should transition to next round if not last round', async () => {
      const auction = await TestHelpers.createAuction({
        creatorId: creator._id,
        status: AuctionStatus.ACTIVE,
        currentRound: 0,
        rounds: [
          {
            roundNumber: 1,
            giftsToDistribute: 1,
            startTime: new Date(Date.now() - 1000),
            endTime: new Date(Date.now() - 100),
            duration: 60,
            status: RoundStatus.ACTIVE,
            winnerIds: [],
          },
          {
            roundNumber: 2,
            giftsToDistribute: 1,
            startTime: new Date(),
            endTime: new Date(),
            duration: 60,
            status: RoundStatus.PENDING,
            winnerIds: [],
          },
        ],
      });

      const commandId = TestHelpers.generateIdempotencyKey();
      await auctionEngine.endRound(auction._id.toString(), 0, commandId);

      const updatedAuction = await auctionRepository.findById(auction._id.toString());
      expect(updatedAuction!.currentRound).toBe(1);
      expect(updatedAuction!.rounds[1].status).toBe(RoundStatus.ACTIVE);
      expect(updatedAuction!.status).toBe(AuctionStatus.ACTIVE); // Still active
    });

    it('should complete auction if last round', async () => {
      const auction = await TestHelpers.createAuction({
        creatorId: creator._id,
        status: AuctionStatus.ACTIVE,
        currentRound: 0,
        rounds: [
          {
            roundNumber: 1,
            giftsToDistribute: 1,
            startTime: new Date(Date.now() - 1000),
            endTime: new Date(Date.now() - 100),
            duration: 60,
            status: RoundStatus.ACTIVE,
            winnerIds: [],
          },
        ],
      });

      const commandId = TestHelpers.generateIdempotencyKey();
      await auctionEngine.endRound(auction._id.toString(), 0, commandId);

      const updatedAuction = await auctionRepository.findById(auction._id.toString());
      expect(updatedAuction!.status).toBe(AuctionStatus.COMPLETED);
    });

    it('should throw error if round is not active', async () => {
      const auction = await TestHelpers.createAuction({
        creatorId: creator._id,
        status: AuctionStatus.ACTIVE,
        currentRound: 0,
        rounds: [
          {
            roundNumber: 1,
            giftsToDistribute: 1,
            startTime: new Date(),
            endTime: new Date(),
            duration: 60,
            status: RoundStatus.COMPLETED,
            winnerIds: [],
          },
        ],
      });

      const commandId = TestHelpers.generateIdempotencyKey();
      await expect(auctionEngine.endRound(auction._id.toString(), 0, commandId)).rejects.toThrow(
        'Round is not active',
      );
    });

    it('should throw error if invalid round number', async () => {
      const auction = await TestHelpers.createAuction({
        creatorId: creator._id,
        status: AuctionStatus.ACTIVE,
        currentRound: 0,
      });

      const commandId = TestHelpers.generateIdempotencyKey();
      await expect(auctionEngine.endRound(auction._id.toString(), 999, commandId)).rejects.toThrow(
        'Invalid round number',
      );
    });
  });

  describe('checkAntiSniping', () => {
    it('should return true if less than 30 seconds remaining', async () => {
      const auction = await TestHelpers.createAuction({
        creatorId: creator._id,
        status: AuctionStatus.ACTIVE,
        currentRound: 0,
        rounds: [
          {
            roundNumber: 1,
            giftsToDistribute: 1,
            startTime: new Date(Date.now() - 1000),
            endTime: new Date(Date.now() + 20 * 1000), // 20 seconds remaining
            duration: 60,
            status: RoundStatus.ACTIVE,
            winnerIds: [],
          },
        ],
      });

      const shouldExtend = await auctionEngine.checkAntiSniping(auction._id.toString(), 0);

      expect(shouldExtend).toBe(true);
    });

    it('should return false if more than 30 seconds remaining', async () => {
      const auction = await TestHelpers.createAuction({
        creatorId: creator._id,
        status: AuctionStatus.ACTIVE,
        currentRound: 0,
        rounds: [
          {
            roundNumber: 1,
            giftsToDistribute: 1,
            startTime: new Date(Date.now() - 1000),
            endTime: new Date(Date.now() + 60 * 1000), // 60 seconds remaining
            duration: 60,
            status: RoundStatus.ACTIVE,
            winnerIds: [],
          },
        ],
      });

      const shouldExtend = await auctionEngine.checkAntiSniping(auction._id.toString(), 0);

      expect(shouldExtend).toBe(false);
    });
  });
});
