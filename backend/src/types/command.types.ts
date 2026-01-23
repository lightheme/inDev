export interface Command {
  type: string;
  payload: any;
  idempotencyKey: string;

  validate(): Promise<boolean>;
  execute(): Promise<CommandResult>;
}

export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
