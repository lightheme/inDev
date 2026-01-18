import { BidRepository } from '../repositories/BidRepository';

interface Winner {
  userId: string;
  bidId: string;
  amount: number;
  rank: number;
  giftNumber: number;
}

export class WinnerCalculator {
  private bidRepository: BidRepository;

  constructor() {
    this.bidRepository = new BidRepository();
  }

  async calculateWinners(
    auctionId: string,
    roundNumber: number,
    giftsCount: number,
  ): Promise<Winner[]> {
    const bids = await this.bidRepository.findActiveByAuctionRoundSorted(auctionId, roundNumber);

    const userBids = new Map<string, { totalAmount: number; earliestBid: Date; bids: any[] }>();

    for (const bid of bids) {
      const userId = bid.userId._id.toString();

      if (!userBids.has(userId)) {
        userBids.set(userId, {
          totalAmount: 0,
          earliestBid: bid.placedAt,
          bids: [],
        });
      }

      const userBid = userBids.get(userId)!;
      userBid.totalAmount += bid.amount;
      userBid.bids.push(bid);

      if (bid.placedAt < userBid.earliestBid) {
        userBid.earliestBid = bid.placedAt;
      }
    }

    const sortedUsers = Array.from(userBids.entries()).sort((a, b) => {
      if (b[1].totalAmount !== a[1].totalAmount) {
        return b[1].totalAmount - a[1].totalAmount;
      }
      return a[1].earliestBid.getTime() - b[1].earliestBid.getTime();
    });

    const winners: Winner[] = [];
    const winnersCount = Math.min(giftsCount, sortedUsers.length);

    for (let i = 0; i < winnersCount; i++) {
      const [userId, userBid] = sortedUsers[i];

      winners.push({
        userId,
        bidId: userBid.bids[0].id,
        amount: userBid.totalAmount,
        rank: i + 1,
        giftNumber: i + 1,
      });
    }

    return winners;
  }

  async getRanking(auctionId: string, roundNumber: number): Promise<any[]> {
    const bids = await this.bidRepository.findActiveByAuctionRoundWithUser(auctionId, roundNumber);

    const userBids = new Map<string, { totalAmount: number; earliestBid: Date; user: any }>();

    for (const bid of bids) {
      const userObj = bid.userId as any;
      const userId = userObj._id.toString();

      if (!userBids.has(userId)) {
        userBids.set(userId, {
          totalAmount: 0,
          earliestBid: bid.placedAt,
          user: userObj,
        });
      }

      const userBid = userBids.get(userId)!;
      userBid.totalAmount += bid.amount;

      if (bid.placedAt < userBid.earliestBid) {
        userBid.earliestBid = bid.placedAt;
      }
    }

    return Array.from(userBids.entries())
      .sort((a, b) => {
        if (b[1].totalAmount !== a[1].totalAmount) {
          return b[1].totalAmount - a[1].totalAmount;
        }
        return a[1].earliestBid.getTime() - b[1].earliestBid.getTime();
      })
      .map(([userId, data], index) => ({
        rank: index + 1,
        userId,
        user: data.user,
        totalAmount: data.totalAmount,
        placedAt: data.earliestBid,
      }));
  }
}
