export enum BidStatus {
    ACTIVE = 'active',
    WON = 'won',
    REFUNDED = 'refunded'
}

export interface Bid {
    id: string;
    auctionId: string;
    userId: string;
    roundNumber: number;
    amount: number;
    placedAt: Date;
    status: BidStatus;
    idempotencyKey: string;  
}

