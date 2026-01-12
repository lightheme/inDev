export enum LedgerEntryTypes {
    TOPUP = 'topup',
    RESERVE = 'reserve',
    CHARGE = 'charge',
    REFUND = 'refund'
}

export enum LedgerRefType {
    AUCTION = 'auction',
    ROUND = 'round',
    BID = 'bid',
    USER = 'user'
}

export interface LedgerEntry {
    userId: string;
    type: LedgerEntryTypes;
    amount: number;
    refType: LedgerRefType;
    refId: string;
    commandId: string;
    createdAt: Date;
}
