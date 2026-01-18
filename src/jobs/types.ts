export type EndRoundJobPayload = {
  type: 'END_ROUND';
  auctionId: string;
  roundNumber: number;
  attempt: number;
};

export type AutoBidTickJobPayload = {
  type: 'AUTO_BID_TICK';
  auctionId: string;
  roundNumber: number;
  botUserId: string;
  tick: number;
  attempt: number;
};

export type BalanceCleanupJobPayload = {
  type: 'BALANCE_CLEANUP';
  tick: number;
  attempt: number;
};

export type JobPayload = EndRoundJobPayload | AutoBidTickJobPayload | BalanceCleanupJobPayload;

export type JobType = JobPayload['type'];
