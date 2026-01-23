import { config } from '../config/environment';
import { createRedisClient, RedisLike } from './redisClient';

export type EnqueueResult =
  | 'enqueued'
  | 'delayed'
  | 'duplicate_done'
  | 'duplicate_inflight'
  | 'duplicate_queued';

export interface QueueClient {
  enqueue(queueName: string, jobId: string, payloadJson: string, runAtMs?: number): Promise<EnqueueResult>;
  popReady(queueName: string, workerId: string, timeoutSeconds?: number): Promise<string | null>;
  getPayload(queueName: string, jobId: string): Promise<string | null>;
  heartbeat(queueName: string, jobId: string, workerId: string): Promise<void>;
  ackSuccess(queueName: string, jobId: string): Promise<void>;
  failAndRetry(
    queueName: string,
    jobId: string,
    payloadJson: string,
    error: string,
    attempt: number,
    maxAttempts: number,
  ): Promise<'retry' | 'dead'>;
  tickDelayed(queueName: string, batchSize: number): Promise<number>;
  recoverInflight(queueName: string, timeoutMs: number, batchSize: number): Promise<number>;
  disconnect(): Promise<void>;
}

const enqueueScript = `
local doneKey = KEYS[1]
local inflightKey = KEYS[2]
local delayedKey = KEYS[3]
local readyKey = KEYS[4]
local payloadKey = KEYS[5]

local jobId = ARGV[1]
local payloadJson = ARGV[2]
local runAtMs = tonumber(ARGV[3])
local nowMs = tonumber(ARGV[4])
local payloadTtlSec = tonumber(ARGV[5])

if redis.call('EXISTS', doneKey) == 1 then
  return 'duplicate_done'
end

if redis.call('ZSCORE', inflightKey, jobId) then
  return 'duplicate_inflight'
end

if redis.call('EXISTS', payloadKey) == 1 then
  if redis.call('ZSCORE', delayedKey, jobId) then
    return 'duplicate_queued'
  end
  local inReady = redis.call('LPOS', readyKey, jobId)
  if inReady then
    return 'duplicate_queued'
  end
end

redis.call('SET', payloadKey, payloadJson, 'EX', payloadTtlSec)

if runAtMs > nowMs then
  redis.call('ZADD', delayedKey, runAtMs, jobId)
  return 'delayed'
end

redis.call('LPUSH', readyKey, jobId)
return 'enqueued'
`;

const ackSuccessScript = `
local inflightKey = KEYS[1]
local payloadKey = KEYS[2]
local leaseKey = KEYS[3]
local lockKey = KEYS[4]
local doneKey = KEYS[5]

local jobId = ARGV[1]
local doneTtlSec = tonumber(ARGV[2])

redis.call('ZREM', inflightKey, jobId)
redis.call('DEL', payloadKey, leaseKey, lockKey)
redis.call('SET', doneKey, '1', 'EX', doneTtlSec)
return 'ok'
`;

const failAndRetryScript = `
local inflightKey = KEYS[1]
local delayedKey = KEYS[2]
local payloadKey = KEYS[3]
local leaseKey = KEYS[4]
local lockKey = KEYS[5]
local doneKey = KEYS[6]
local deadKey = KEYS[7]

local jobId = ARGV[1]
local payloadJson = ARGV[2]
local errorJson = ARGV[3]
local attempt = tonumber(ARGV[4])
local maxAttempts = tonumber(ARGV[5])
local nextRunAtMs = tonumber(ARGV[6])
local payloadTtlSec = tonumber(ARGV[7])
local doneTtlSec = tonumber(ARGV[8])

if attempt + 1 > maxAttempts then
  redis.call('ZREM', inflightKey, jobId)
  redis.call('DEL', leaseKey, lockKey, payloadKey)
  redis.call('LPUSH', deadKey, errorJson)
  redis.call('SET', doneKey, '1', 'EX', doneTtlSec)
  return 'dead'
end

redis.call('ZREM', inflightKey, jobId)
redis.call('DEL', leaseKey, lockKey)
redis.call('SET', payloadKey, payloadJson, 'EX', payloadTtlSec)
redis.call('ZADD', delayedKey, nextRunAtMs, jobId)
return 'retry'
`;

const tickDelayedScript = `
local delayedKey = KEYS[1]
local readyKey = KEYS[2]

local nowMs = tonumber(ARGV[1])
local batchSize = tonumber(ARGV[2])

local due = redis.call('ZRANGEBYSCORE', delayedKey, '-inf', nowMs, 'LIMIT', 0, batchSize)
if #due == 0 then
  return 0
end

redis.call('ZREM', delayedKey, unpack(due))
redis.call('LPUSH', readyKey, unpack(due))
return #due
`;

const recoverInflightScript = `
local inflightKey = KEYS[1]
local readyKey = KEYS[2]

local nowMs = tonumber(ARGV[1])
local timeoutMs = tonumber(ARGV[2])
local batchSize = tonumber(ARGV[3])
local leasePrefix = ARGV[4]

local cutoff = nowMs - timeoutMs
local candidates = redis.call('ZRANGEBYSCORE', inflightKey, '-inf', cutoff, 'LIMIT', 0, batchSize)
local recovered = 0
for _, jobId in ipairs(candidates) do
  local leaseKey = leasePrefix .. jobId
  if redis.call('EXISTS', leaseKey) == 0 then
    redis.call('ZREM', inflightKey, jobId)
    redis.call('LPUSH', readyKey, jobId)
    recovered = recovered + 1
  end
end
return recovered
`;

const backoffScheduleMs = [1000, 5000, 15000, 60000, 300000];

const buildKey = (queueName: string, suffix: string) => `q:${queueName}:${suffix}`;

const buildPayloadKey = (queueName: string, jobId: string) =>
  buildKey(queueName, `payload:${jobId}`);

const buildDoneKey = (queueName: string, jobId: string) => buildKey(queueName, `done:${jobId}`);

const buildLockKey = (queueName: string, jobId: string) => buildKey(queueName, `lock:${jobId}`);

const buildLeaseKey = (queueName: string, jobId: string) => buildKey(queueName, `lease:${jobId}`);

export class RedisQueue implements QueueClient {
  private redis: RedisLike;

  constructor(redis: RedisLike) {
    this.redis = redis;
  }

  async enqueue(
    queueName: string,
    jobId: string,
    payloadJson: string,
    runAtMs: number = Date.now(),
  ): Promise<EnqueueResult> {
    const result = await this.redis.eval(
      enqueueScript,
      5,
      buildDoneKey(queueName, jobId),
      buildKey(queueName, 'inflight'),
      buildKey(queueName, 'delayed'),
      buildKey(queueName, 'ready'),
      buildPayloadKey(queueName, jobId),
      jobId,
      payloadJson,
      String(runAtMs),
      String(Date.now()),
      String(config.queue.payloadTtlSeconds),
    );

    return result as EnqueueResult;
  }

  async popReady(queueName: string, workerId: string, timeoutSeconds = 5): Promise<string | null> {
    const readyKey = buildKey(queueName, 'ready');
    const popped = await this.redis.brpop(readyKey, timeoutSeconds);
    if (!popped) return null;

    const jobId = popped[1];
    const lockKey = buildLockKey(queueName, jobId);
    const lockResult = await this.redis.set(
      lockKey,
      workerId,
      'NX',
      'PX',
      config.queue.jobLockMs,
    );

    if (!lockResult) {
      await this.redis.lpush(readyKey, jobId);
      return null;
    }

    await this.redis.eval(
      `return redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])`,
      1,
      buildKey(queueName, 'inflight'),
      String(Date.now()),
      jobId,
    );

    await this.redis.set(buildLeaseKey(queueName, jobId), workerId, 'PX', config.queue.jobLeaseMs);

    return jobId;
  }

  async getPayload(queueName: string, jobId: string): Promise<string | null> {
    return await this.redis.get(buildPayloadKey(queueName, jobId));
  }

  async heartbeat(queueName: string, jobId: string, workerId: string): Promise<void> {
    await this.redis.set(buildLeaseKey(queueName, jobId), workerId, 'PX', config.queue.jobLeaseMs);
    await this.redis.set(buildLockKey(queueName, jobId), workerId, 'PX', config.queue.jobLockMs);
  }

  async ackSuccess(queueName: string, jobId: string): Promise<void> {
    await this.redis.eval(
      ackSuccessScript,
      5,
      buildKey(queueName, 'inflight'),
      buildPayloadKey(queueName, jobId),
      buildLeaseKey(queueName, jobId),
      buildLockKey(queueName, jobId),
      buildDoneKey(queueName, jobId),
      jobId,
      String(config.queue.doneTtlSeconds),
    );
  }

  async failAndRetry(
    queueName: string,
    jobId: string,
    payloadJson: string,
    error: string,
    attempt: number,
    maxAttempts: number,
  ): Promise<'retry' | 'dead'> {
    const nextAttempt = attempt + 1;
    const backoffIndex = Math.min(nextAttempt - 1, backoffScheduleMs.length - 1);
    const backoffMs = backoffScheduleMs[backoffIndex];
    const nextRunAtMs = Date.now() + backoffMs;

    const deadPayload = JSON.stringify({
      jobId,
      payload: JSON.parse(payloadJson),
      error,
      attempts: nextAttempt,
    });

    const result = await this.redis.eval(
      failAndRetryScript,
      7,
      buildKey(queueName, 'inflight'),
      buildKey(queueName, 'delayed'),
      buildPayloadKey(queueName, jobId),
      buildLeaseKey(queueName, jobId),
      buildLockKey(queueName, jobId),
      buildDoneKey(queueName, jobId),
      buildKey(queueName, 'dead'),
      jobId,
      payloadJson,
      deadPayload,
      String(attempt),
      String(maxAttempts),
      String(nextRunAtMs),
      String(config.queue.payloadTtlSeconds),
      String(config.queue.doneTtlSeconds),
    );

    return result as 'retry' | 'dead';
  }

  async tickDelayed(queueName: string, batchSize: number): Promise<number> {
    const result = await this.redis.eval(
      tickDelayedScript,
      2,
      buildKey(queueName, 'delayed'),
      buildKey(queueName, 'ready'),
      String(Date.now()),
      String(batchSize),
    );

    return Number(result || 0);
  }

  async recoverInflight(queueName: string, timeoutMs: number, batchSize: number): Promise<number> {
    const result = await this.redis.eval(
      recoverInflightScript,
      2,
      buildKey(queueName, 'inflight'),
      buildKey(queueName, 'ready'),
      String(Date.now()),
      String(timeoutMs),
      String(batchSize),
      buildKey(queueName, 'lease:'),
    );

    return Number(result || 0);
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

class InMemoryQueue implements QueueClient {
  private ready: string[] = [];
  private delayed = new Map<string, number>();
  private inflight = new Map<string, number>();
  private payloads = new Map<string, { value: string; expiresAt: number }>();
  private done = new Map<string, number>();
  private locks = new Map<string, { workerId: string; expiresAt: number }>();
  private leases = new Map<string, { workerId: string; expiresAt: number }>();
  private dead: string[] = [];

  private cleanup() {
    const now = Date.now();
    for (const [jobId, expiresAt] of this.done.entries()) {
      if (expiresAt <= now) this.done.delete(jobId);
    }
    for (const [jobId, payload] of this.payloads.entries()) {
      if (payload.expiresAt <= now) this.payloads.delete(jobId);
    }
    for (const [jobId, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) this.locks.delete(jobId);
    }
    for (const [jobId, lease] of this.leases.entries()) {
      if (lease.expiresAt <= now) this.leases.delete(jobId);
    }
  }

  async enqueue(
    queueName: string,
    jobId: string,
    payloadJson: string,
    runAtMs: number = Date.now(),
  ): Promise<EnqueueResult> {
    this.cleanup();
    if (this.done.has(jobId)) return 'duplicate_done';
    if (this.inflight.has(jobId)) return 'duplicate_inflight';
    if (this.payloads.has(jobId) && (this.delayed.has(jobId) || this.ready.includes(jobId))) {
      return 'duplicate_queued';
    }

    this.payloads.set(jobId, {
      value: payloadJson,
      expiresAt: Date.now() + config.queue.payloadTtlSeconds * 1000,
    });

    if (runAtMs > Date.now()) {
      this.delayed.set(jobId, runAtMs);
      return 'delayed';
    }

    this.ready.unshift(jobId);
    return 'enqueued';
  }

  async popReady(queueName: string, workerId: string): Promise<string | null> {
    this.cleanup();
    const jobId = this.ready.pop();
    if (!jobId) return null;

    if (this.locks.has(jobId)) return null;

    this.locks.set(jobId, {
      workerId,
      expiresAt: Date.now() + config.queue.jobLockMs,
    });

    this.inflight.set(jobId, Date.now());
    this.leases.set(jobId, {
      workerId,
      expiresAt: Date.now() + config.queue.jobLeaseMs,
    });

    return jobId;
  }

  async getPayload(queueName: string, jobId: string): Promise<string | null> {
    this.cleanup();
    return this.payloads.get(jobId)?.value ?? null;
  }

  async heartbeat(queueName: string, jobId: string, workerId: string): Promise<void> {
    this.cleanup();
    this.leases.set(jobId, {
      workerId,
      expiresAt: Date.now() + config.queue.jobLeaseMs,
    });
    this.locks.set(jobId, {
      workerId,
      expiresAt: Date.now() + config.queue.jobLockMs,
    });
  }

  async ackSuccess(queueName: string, jobId: string): Promise<void> {
    this.cleanup();
    this.inflight.delete(jobId);
    this.payloads.delete(jobId);
    this.leases.delete(jobId);
    this.locks.delete(jobId);
    this.done.set(jobId, Date.now() + config.queue.doneTtlSeconds * 1000);
  }

  async failAndRetry(
    queueName: string,
    jobId: string,
    payloadJson: string,
    error: string,
    attempt: number,
    maxAttempts: number,
  ): Promise<'retry' | 'dead'> {
    this.cleanup();
    const nextAttempt = attempt + 1;
    if (nextAttempt > maxAttempts) {
      this.inflight.delete(jobId);
      this.leases.delete(jobId);
      this.locks.delete(jobId);
      this.payloads.delete(jobId);
      this.dead.unshift(
        JSON.stringify({
          jobId,
          payload: JSON.parse(payloadJson),
          error,
          attempts: nextAttempt,
        }),
      );
      this.done.set(jobId, Date.now() + config.queue.doneTtlSeconds * 1000);
      return 'dead';
    }

    const backoffIndex = Math.min(nextAttempt - 1, backoffScheduleMs.length - 1);
    const nextRunAtMs = Date.now() + backoffScheduleMs[backoffIndex];

    this.inflight.delete(jobId);
    this.leases.delete(jobId);
    this.locks.delete(jobId);
    this.payloads.set(jobId, {
      value: payloadJson,
      expiresAt: Date.now() + config.queue.payloadTtlSeconds * 1000,
    });
    this.delayed.set(jobId, nextRunAtMs);
    return 'retry';
  }

  async tickDelayed(queueName: string, batchSize: number): Promise<number> {
    this.cleanup();
    const now = Date.now();
    const due = Array.from(this.delayed.entries())
      .filter(([, runAt]) => runAt <= now)
      .sort((a, b) => a[1] - b[1])
      .slice(0, batchSize);

    for (const [jobId] of due) {
      this.delayed.delete(jobId);
      this.ready.unshift(jobId);
    }

    return due.length;
  }

  async recoverInflight(queueName: string, timeoutMs: number, batchSize: number): Promise<number> {
    this.cleanup();
    const now = Date.now();
    const candidates = Array.from(this.inflight.entries())
      .filter(([, startedAt]) => startedAt <= now - timeoutMs)
      .slice(0, batchSize);

    let recovered = 0;
    for (const [jobId] of candidates) {
      if (!this.leases.has(jobId)) {
        this.inflight.delete(jobId);
        this.ready.unshift(jobId);
        recovered += 1;
      }
    }

    return recovered;
  }

  async disconnect(): Promise<void> {
    return;
  }
}

export const createQueue = (): QueueClient => {
  if (config.nodeEnv === 'test') {
    return new InMemoryQueue();
  }

  const redis = createRedisClient();
  return new RedisQueue(redis);
};
