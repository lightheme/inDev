import Redis from 'ioredis';
import { config } from '../config/environment';

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(...keys: string[]): Promise<number>;
  eval(script: string, numKeys: number, ...args: Array<string | number>): Promise<any>;
  brpop(key: string, timeout: number): Promise<[string, string] | null>;
  lpush(key: string, ...values: string[]): Promise<number>;
  quit(): Promise<void>;
}

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    this.cleanupExpired();
    const entry = this.store.get(key);
    return entry ? entry.value : null;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<string | null> {
    this.cleanupExpired();
    let expiresAt: number | undefined;
    for (let i = 0; i < args.length; i += 2) {
      const mode = String(args[i]).toUpperCase();
      const ttl = Number(args[i + 1]);
      if (mode === 'EX') {
        expiresAt = Date.now() + ttl * 1000;
      }
      if (mode === 'PX') {
        expiresAt = Date.now() + ttl;
      }
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    this.cleanupExpired();
    const current = this.store.get(key);
    const nextValue = (current ? Number(current.value) : 0) + 1;
    this.store.set(key, { value: String(nextValue), expiresAt: current?.expiresAt });
    return nextValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.cleanupExpired();
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, entry);
    return 1;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count += 1;
    }
    return count;
  }

  async eval(): Promise<any> {
    throw new Error('InMemoryRedis does not support eval');
  }

  async brpop(): Promise<[string, string] | null> {
    return null;
  }

  async lpush(): Promise<number> {
    return 0;
  }

  async quit(): Promise<void> {
    return;
  }
}

export const createRedisClient = (): RedisLike => {
  if (config.nodeEnv === 'test') {
    return new InMemoryRedis();
  }

  if (config.redis.url) {
    return new Redis(config.redis.url);
  }

  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
  });
};
