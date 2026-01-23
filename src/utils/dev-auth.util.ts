import crypto from 'crypto';
import { config } from '../config/environment';

export interface DevAuthTokenPayload {
  sub: string;
  login: string;
  role?: string;
  iat: number;
  exp: number;
}

export interface DevAuthUserConfig {
  login: string;
  password: string;
  userId?: number;
  role?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

const base64UrlEncode = (input: Buffer | string): string => {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlDecode = (input: string): Buffer => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
};

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const getLoginDerivedTelegramId = (login: string): number => {
  const hash = crypto.createHash('sha256').update(`dev:${login}`).digest('hex');
  const value = BigInt(`0x${hash}`);
  const mod = BigInt(9_000_000_000_000);
  return Number(value % mod);
};

export const parseDevAuthUsers = (): DevAuthUserConfig[] => {
  if (config.devAuth.users) {
    const parsed = JSON.parse(config.devAuth.users);
    if (!Array.isArray(parsed)) {
      throw new Error('DEV_AUTH_USERS must be a JSON array');
    }
    return parsed;
  }

  if (config.devAuth.login && config.devAuth.password) {
    return [
      {
        login: config.devAuth.login,
        password: config.devAuth.password,
      },
    ];
  }

  return [];
};

export const findDevAuthUser = (
  login: string,
  password: string,
): DevAuthUserConfig | null => {
  const users = parseDevAuthUsers();
  const user = users.find((item) => item.login === login && item.password === password);
  return user || null;
};

export const resolveDevUserTelegramId = (user: DevAuthUserConfig): number => {
  if (typeof user.userId === 'number') {
    return user.userId;
  }

  return getLoginDerivedTelegramId(user.login);
};

export const issueDevToken = (payload: {
  sub: string;
  login: string;
  role?: string;
}): string => {
  if (!config.devAuth.jwtSecret) {
    throw new Error('DEV_AUTH_JWT_SECRET is not configured');
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body: DevAuthTokenPayload = {
    sub: payload.sub,
    login: payload.login,
    role: payload.role,
    iat: now,
    exp: now + config.devAuth.ttlSeconds,
  };
  const payloadEncoded = base64UrlEncode(JSON.stringify(body));
  const data = `${header}.${payloadEncoded}`;
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', config.devAuth.jwtSecret).update(data).digest(),
  );
  return `${data}.${signature}`;
};

export const verifyDevToken = (token: string): DevAuthTokenPayload | null => {
  if (!config.devAuth.jwtSecret) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const expected = base64UrlEncode(
    crypto.createHmac('sha256', config.devAuth.jwtSecret).update(data).digest(),
  );

  if (!timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload).toString());
    const now = Math.floor(Date.now() / 1000);
    if (typeof decoded.exp !== 'number' || decoded.exp <= now) {
      return null;
    }
    return decoded as DevAuthTokenPayload;
  } catch (error) {
    return null;
  }
};
