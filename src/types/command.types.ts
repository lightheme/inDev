export interface Command {
    type: string;
    payload: any;
    idempotencyKey: string;
    timestamp: Date;
}

export interface CommandResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
