export enum BidStatus {
    ACTIVE = 'active',
    WON = 'won',
    REFUNDED = 'refunded'
}

export interface Bid {
    id: string;
    auctionId: string;
    userId: string;
    roundId: string;
    amount: number;
    placedAt: Date;
    status: BidStatus;
}

export interface PlaceBidDTO {
    auctionId: string;
    userId: string;
    amount: number;
    idempotencyKey: string;
}
