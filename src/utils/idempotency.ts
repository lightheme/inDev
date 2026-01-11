import crypto from "crypto";

export function generateIdempotencyKey(userId: string): string {
  const timestamp = Date.now().toString(36); // base36 для компактности
  const randomBytes = crypto.randomBytes(12); // 96 бит энтропии
  const randomBase62 = toBase62(randomBytes);
  
  return `${userId}:${timestamp}:${randomBase62}`;
}

function toBase62(buffer: Buffer): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let num = BigInt('0x' + buffer.toString('hex'));
  
  while (num > 0n) {
    result = chars[Number(num % 62n)] + result;
    num = num / 62n;
  }
  
  return result || '0';
}

export function validateIdempotencyKey(key: string): boolean {
  const pattern = /^[a-zA-Z0-9]+:[a-z0-9]+:[a-zA-Z0-9]+$/;
  return pattern.test(key);
}
