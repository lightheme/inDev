import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config/environment';

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  login?: string;
  email?: string;
}

export const issueAuthToken = (payload: {
  sub: string;
  login?: string;
  email?: string;
}): string => {
  if (!config.auth.jwtSecret) {
    throw new Error('AUTH_JWT_SECRET is not configured');
  }

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.ttlSeconds,
  });
};

export const verifyAuthToken = (token: string): AuthTokenPayload | null => {
  if (!config.auth.jwtSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    return decoded as AuthTokenPayload;
  } catch (error) {
    return null;
  }
};
