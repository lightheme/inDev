import bcrypt from 'bcryptjs';
import { config } from '../config/environment';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.auth.passwordSaltRounds);
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};
