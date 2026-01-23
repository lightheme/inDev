export interface CreateAuctionDTO {
  title: string;
  totalGifts: number;
  giftsPerRound: number[];
  roundDurations: number[];
}
