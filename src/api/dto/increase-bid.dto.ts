export interface IncreaseBidDTO {
    bidId: string;
    auctionId: string;
    userId: string;
    amount: number;
    idempotencyKey: string;
}
