import { LedgerRefType } from "../../types/ledger.types";

export interface BalanceOperationDTO {
    userId: string;
    amount: number;
    refType: LedgerRefType;
    refId: string;
    commandId: string;
}
