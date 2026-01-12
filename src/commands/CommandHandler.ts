import { Command, CommandResult } from "../types/command.types";
import { LockManager } from "../locks/LockManager";
import { logger } from "../utils/logger";

export class CommandHandler {
    private lockManager: LockManager;

    constructor() {
        this.lockManager = new LockManager();
    }

    async execute<T>(command: Command): Promise<CommandResult<T>> {
        const startTime = Date.now();

        try {
            logger.info(`Execute command: ${command.type}`, {
                idempotencyKey: command.idempotencyKey
            });
            
            const isValid = await command.validate();
            if(!isValid) {
                return {
                    success: false,
                    error: 'Command validation failed'
                };
            }

            const lockKey = this.getLockKey(command);
            let lock;

            if(lockKey) {
                lock = await this.lockManager.acquireLock(lockKey, 10000);
                if(!lock) {
                    return {
                        success: false,
                        error: 'Failed to acquire lock. Please try again.'
                    };
                }
            }

            try {
                const result = await command.execute();

                logger.info(`Command executed successfully: ${command.type}`, {
                    duration: Date.now() - startTime
                });

                return result;
            } finally {
                if(lock) {
                    await this.lockManager.releaseLock(lockKey);
                }
            }
        } catch(error: any) {
            logger.error(`Command execution failed: ${command.type}`, {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message || 'Command execution failed'
            };
        }
    }

    private getLockKey(command: Command): string | null {
        const payload = command.payload;

        if (payload.auctionId && this.isAuctionCommand(command.type)) {
            return `auction:${payload.auctionId}`;
        }
  
        if (payload.userId && this.isBalanceCommand(command.type)) {
            return `user:${payload.userId}:balance`;
        }
  
        return null;
    }

    private isAuctionCommand(type: string): boolean {
        return [
            'PlaceBid', 
            'IncreaseBid', 
            'EndRound', 
            'StartRound', 
            'ExtendRound'
        ].includes(type);
    }

    private isBalanceCommand(type: string): boolean {
        return [
            'TopUpBalance', 
            'ReserveBalance', 
            'DeductBalance', 
            'RefundBalance'
        ].includes(type);
    }
}
