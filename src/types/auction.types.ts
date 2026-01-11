export enum AuctionStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    COMPETED = 'completed',
    CANCELLED = 'cancelled'
}

export enum RoundStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    COMPLETED = 'completed'
}

export interface Auction {
    id: string;
    creatorId: string;
    title: string;
    totalGifts: number;
    status: AuctionStatus;
    rounds: Round[];
    currentRound: number;
    createdAt: Date;
}

export interface Round {
    roundNumber: number;
    giftsToDistribute: number;
    startTime: Date;
    endTime: Date;
    extendedTime: number;
    status: RoundStatus;
    winnerIds: string[];
}

