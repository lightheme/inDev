import crypto from 'crypto';
import { config } from '../config/environment';

export interface TelegramUser {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export type TelegramInitDataErrorCode =
  | 'MALFORMED_INIT_DATA'
  | 'SIGNATURE_MISMATCH'
  | 'INIT_DATA_EXPIRED'
  | 'BOT_TOKEN_MISSING';

export class TelegramInitDataValidationError extends Error {
  code: TelegramInitDataErrorCode;

  constructor(code: TelegramInitDataErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'TelegramInitDataValidationError';
  }
}

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a, 'hex');
  const bBuffer = Buffer.from(b, 'hex');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const buildDataCheckString = (urlParams: URLSearchParams): string => {
  const dataCheckArray: string[] = [];

  Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      dataCheckArray.push(`${key}=${value}`);
    });

  return dataCheckArray.join('\n');
};

const parseAuthDate = (authDateRaw: string | null): number => {
  if (!authDateRaw) {
    return 0;
  }
  const parsed = Number.parseInt(authDateRaw, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
};

export const validateTelegramInitData = (initData: string): TelegramUser => {
  if (!initData) {
    throw new TelegramInitDataValidationError(
      'MALFORMED_INIT_DATA',
      'Malformed initData: missing hash/auth_date',
    );
  }

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  const authDateRaw = urlParams.get('auth_date');

  if (!hash || !authDateRaw) {
    throw new TelegramInitDataValidationError(
      'MALFORMED_INIT_DATA',
      'Malformed initData: missing hash/auth_date',
    );
  }

  const authDate = parseAuthDate(authDateRaw);
  if (!authDate) {
    throw new TelegramInitDataValidationError(
      'MALFORMED_INIT_DATA',
      'Malformed initData: missing hash/auth_date',
    );
  }

  urlParams.delete('hash');

  const botToken = config.telegram.botToken;
  if (!botToken) {
    throw new TelegramInitDataValidationError(
      'BOT_TOKEN_MISSING',
      'Telegram bot token is not configured',
    );
  }

  const dataCheckString = buildDataCheckString(urlParams);
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!timingSafeEqual(calculatedHash, hash)) {
    throw new TelegramInitDataValidationError(
      'SIGNATURE_MISMATCH',
      'InitData signature mismatch',
    );
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - authDate;

  if (timeDiff > config.telegram.authMaxAgeSeconds || timeDiff < 0) {
    throw new TelegramInitDataValidationError('INIT_DATA_EXPIRED', 'InitData expired');
  }

  const userParam = urlParams.get('user');
  if (!userParam) {
    throw new TelegramInitDataValidationError(
      'MALFORMED_INIT_DATA',
      'Malformed initData: missing user',
    );
  }

  let user: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };

  try {
    user = JSON.parse(userParam);
  } catch (error) {
    throw new TelegramInitDataValidationError(
      'MALFORMED_INIT_DATA',
      'Malformed initData: invalid user payload',
    );
  }

  if (typeof user.id !== 'number') {
    throw new TelegramInitDataValidationError(
      'MALFORMED_INIT_DATA',
      'Malformed initData: invalid user payload',
    );
  }

  return {
    telegramId: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
  };
};

export const validataTelegramInitData = validateTelegramInitData;
