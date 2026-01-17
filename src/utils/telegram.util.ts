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

export const validataTelegramInitData = (initData: string): TelegramUser | null => {
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
      console.warn('TELEGRAM_BOT_TOKEN not set, skipping validation in development');
      // [WARN] В development можно пропустить валидацию
      if (config.nodeEnv === 'development') {
        const userParam = urlParams.get('user');
        if (userParam) {
          return JSON.parse(userParam);
        }
      }
      return null;
    }

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) return null;

    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    if (timeDiff > 86400) return null;

    const userParam = urlParams.get('user');
    if (!userParam) return null;

    const user: TelegramUser = JSON.parse(userParam);

    return user;
  } catch (error) {
    return null;
  }
};
