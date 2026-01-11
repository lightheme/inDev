export interface PlaceBidDTO {
    auctionId: string;
    userId: string;
    amount: number;
    idempotencyKey: string;
}
