import crypto from 'crypto';
import { config } from '../config/environment';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url: string;
}

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a, 'hex');
  const bBuffer = Buffer.from(b, 'hex');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export const validateTelegramInitData = (initData: string): TelegramUser | null => {
  try {
    if (!initData) return null;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) return null;

    urlParams.delete('hash');

    const dataCheckArray: string[] = [];

    Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        dataCheckArray.push(`${key}=${value}`);
      });

    const dataCheckString = dataCheckArray.join('\n');

    const botToken = config.telegram.botToken;

    if (!botToken) {
      return null;
    }

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (!timingSafeEqual(calculatedHash, hash)) return null;

    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    if (!authDate || timeDiff > config.telegram.authMaxAgeSeconds) return null;

    const userParam = urlParams.get('user');
    if (!userParam) return null;

    const user: TelegramUser = JSON.parse(userParam);

    return user;
  } catch (error) {
    return null;
  }
};

export const validataTelegramInitData = validateTelegramInitData;
