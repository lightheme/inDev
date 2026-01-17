import { AuctionEngine } from '../../core/AuctionEngine';
import { PlaceBidCommand } from '../../commands/bid/PlaceBidCommand';
import { IncreaseBidCommand } from '../../commands/bid/IncreaseBidCommand';
import { TestHelpers } from '../helpers/test-helpers';
import { AuctionModel } from '../../models/Auctions.model';
import { BidModel } from '../../models/Bid.model';
import { UserModel } from '../../models/User.model';
import { AuctionStatus, RoundStatus } from '../../types/auction.types';
import { BidStatus } from '../../types/bid.types';
import mongoose from 'mongoose';

/**
 * Integration test for complete auction flow:
 * 1. Create auction
 * 2. Users place bids
 * 3. Users increase bids
 * 4. Round ends
 * 5. Winners are charged, losers are refunded
 * 6. Next round starts (if applicable)
 */
describe('Auction Flow Integration', () => {
  let auctionEngine: AuctionEngine;
  let creator: any;
  let users: any[];
  let auction: any;

  beforeEach(async () => {
    auctionEngine = new AuctionEngine();
    creator = await TestHelpers.createUser({ telegramId: 999, balance: 1000 });

    users = [
      await TestHelpers.createUser({ telegramId: 1, balance: 1000 }),
      await TestHelpers.createUser({ telegramId: 2, balance: 1000 }),
      await TestHelpers.createUser({ telegramId: 3, balance: 1000 }),
    ];
  });

  it('should complete full auction flow: create -> bid -> increase -> end round -> charge winners', async () => {
    // 1. Create auction
    auction = await auctionEngine.createAuction({
      creatorId: creator._id.toString(),
      title: 'Test Auction',
      totalGifts: 2,
      giftsPerRound: [1, 1],
      roundDurations: [60, 60],
    });

    expect(auction.status).toBe(AuctionStatus.ACTIVE);
    expect(auction.rounds[0].status).toBe(RoundStatus.ACTIVE);

    // 2. Users place bids
    const bid1Key = TestHelpers.generateIdempotencyKey();
    const bid2Key = TestHelpers.generateIdempotencyKey();
    const bid3Key = TestHelpers.generateIdempotencyKey();

    const placeBid1 = new PlaceBidCommand({
      auctionId: auction._id.toString(),
      userId: users[0]._id.toString(),
      amount: 200,
      idempotencyKey: bid1Key,
    });
    await placeBid1.execute();

    const placeBid2 = new PlaceBidCommand({
      auctionId: auction._id.toString(),
      userId: users[1]._id.toString(),
      amount: 150,
      idempotencyKey: bid2Key,
    });
    await placeBid2.execute();

    const placeBid3 = new PlaceBidCommand({
      auctionId: auction._id.toString(),
      userId: users[2]._id.toString(),
      amount: 100,
      idempotencyKey: bid3Key,
    });
    await placeBid3.execute();

    // Verify bids and reserved balances
    let user1 = await UserModel.findById(users[0]._id);
    let user2 = await UserModel.findById(users[1]._id);
    let user3 = await UserModel.findById(users[2]._id);

    expect(user1!.reservedBalance).toBe(200);
    expect(user2!.reservedBalance).toBe(150);
    expect(user3!.reservedBalance).toBe(100);

    const bids = await BidModel.find({
      auctionId: auction._id,
      roundNumber: 1,
    });
    expect(bids.length).toBe(3);

    // 3. User 1 increases bid
    const bid1 = await BidModel.findOne({ idempotencyKey: bid1Key });
    const increaseKey = TestHelpers.generateIdempotencyKey();

    const increaseBid = new IncreaseBidCommand({
      bidId: bid1!._id.toString(),
      auctionId: auction._id.toString(),
      userId: users[0]._id.toString(),
      amount: 100,
      idempotencyKey: increaseKey,
    });
    await increaseBid.execute();

    // Verify bid increased and additional balance reserved
    const updatedBid1 = await BidModel.findById(bid1!._id);
    expect(updatedBid1!.amount).toBe(300); // 200 + 100

    user1 = await UserModel.findById(users[0]._id);
    expect(user1!.reservedBalance).toBe(300); // 200 + 100

    // 4. End round (user 1 should win with 300, user 2 with 150)
    const endRoundCommandId = TestHelpers.generateIdempotencyKey();
    await auctionEngine.endRound(auction._id.toString(), 0, endRoundCommandId);

    // Verify round completed
    const updatedAuction = await AuctionModel.findById(auction._id);
    expect(updatedAuction!.rounds[0].status).toBe(RoundStatus.COMPLETED);
    expect(updatedAuction!.rounds[0].winnerIds.length).toBe(1);
    expect(updatedAuction!.rounds[0].winnerIds[0].toString()).toBe(users[0]._id.toString());

    // Verify bid statuses
    const allBids = await BidModel.find({
      auctionId: auction._id,
      roundNumber: 1,
    });
    const winnerBid = allBids.find((b) => b.userId.toString() === users[0]._id.toString());
    const loserBids = allBids.filter((b) => b.userId.toString() !== users[0]._id.toString());

    expect(winnerBid!.status).toBe(BidStatus.WON);
    loserBids.forEach((bid) => {
      expect(bid.status).toBe(BidStatus.REFUNDED);
    });

    // 5. Verify financial correctness
    user1 = await UserModel.findById(users[0]._id);
    user2 = await UserModel.findById(users[1]._id);
    user3 = await UserModel.findById(users[2]._id);

    // Winner: charged 300
    expect(user1!.balance).toBe(700); // 1000 - 300
    expect(user1!.reservedBalance).toBe(0); // 300 - 300

    // Losers: refunded (balance unchanged, reservedBalance released)
    expect(user2!.balance).toBe(1000); // Unchanged
    expect(user2!.reservedBalance).toBe(0); // 150 - 150 (released)
    expect(user3!.balance).toBe(1000); // Unchanged
    expect(user3!.reservedBalance).toBe(0); // 100 - 100 (released)
  });

  it('should handle idempotency correctly across retries', async () => {
    auction = await auctionEngine.createAuction({
      creatorId: creator._id.toString(),
      title: 'Test Auction',
      totalGifts: 1,
      giftsPerRound: [1],
      roundDurations: [60],
    });

    const idempotencyKey = TestHelpers.generateIdempotencyKey();

    // First attempt
    const command1 = new PlaceBidCommand({
      auctionId: auction._id.toString(),
      userId: users[0]._id.toString(),
      amount: 200,
      idempotencyKey,
    });
    const result1 = await command1.execute();

    // Retry with same idempotency key
    const command2 = new PlaceBidCommand({
      auctionId: auction._id.toString(),
      userId: users[0]._id.toString(),
      amount: 200,
      idempotencyKey,
    });
    const result2 = await command2.execute();

    // Should return same bid, not create duplicate
    expect(result1.data._id.toString()).toBe(result2.data._id.toString());

    // Verify only one bid exists
    const bids = await BidModel.find({ idempotencyKey });
    expect(bids.length).toBe(1);

    // Verify balance was only reserved once
    const user = await UserModel.findById(users[0]._id);
    expect(user!.reservedBalance).toBe(200); // Not 400
  });
});
