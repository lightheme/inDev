export const endRoundJobId = (auctionId: string, roundNumber: number) =>
  `endRound:${auctionId}:${roundNumber}`;

export const endRoundCommandId = (auctionId: string, roundNumber: number) =>
  `cmd:endRound:${auctionId}:${roundNumber}`;

export const autoBidJobId = (
  auctionId: string,
  roundNumber: number,
  botUserId: string,
  tick: number,
) => `autobid:${auctionId}:${roundNumber}:${botUserId}:${tick}`;

export const autoBidIdempotencyKey = (
  auctionId: string,
  roundNumber: number,
  botUserId: string,
  tick: number,
) => `idemp:autobid:${auctionId}:${roundNumber}:${botUserId}:${tick}`;

export const cleanupJobId = (tick: number) => `cleanup:${tick}`;

export const cleanupCommandId = (tick: number, userId: string, reasonKey: string) =>
  `cmd:cleanup:${tick}:${userId}:${reasonKey}`;
