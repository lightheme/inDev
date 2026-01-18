import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      'mongodb://admin:password@localhost:27017/auction?authSource=admin',
  },

  redis: {
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },

  queue: {
    name: process.env.QUEUE_NAME || 'main',
    jobLockMs: parseInt(process.env.JOB_LOCK_MS || '30000'),
    jobLeaseMs: parseInt(process.env.JOB_LEASE_MS || '30000'),
    inflightTimeoutMs: parseInt(process.env.INFLIGHT_TIMEOUT_MS || '120000'),
    jobMaxAttempts: parseInt(process.env.JOB_MAX_ATTEMPTS || '5'),
    schedulerIntervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS || '1000'),
    autobidEnabled: (process.env.AUTOBID_ENABLED || 'false').toLowerCase() === 'true',
    autobidBucketMs: parseInt(process.env.AUTOBID_BUCKET_MS || '10000'),
    autobidPollIntervalMs: parseInt(process.env.AUTOBID_POLL_INTERVAL_MS || '3000'),
    autobidMaxPerMinutePerAuction: parseInt(
      process.env.AUTOBID_MAX_PER_MINUTE_PER_AUCTION || '30',
    ),
    cleanupBucketMs: parseInt(process.env.CLEANUP_BUCKET_MS || '60000'),
    cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '30000'),
    payloadTtlSeconds: parseInt(process.env.JOB_PAYLOAD_TTL_SECONDS || '86400'),
    doneTtlSeconds: parseInt(process.env.JOB_DONE_TTL_SECONDS || '86400'),
    heartbeatIntervalMs: parseInt(process.env.JOB_HEARTBEAT_INTERVAL_MS || '10000'),
    tickBatchSize: parseInt(process.env.QUEUE_TICK_BATCH_SIZE || '100'),
    recoverBatchSize: parseInt(process.env.QUEUE_RECOVER_BATCH_SIZE || '100'),
  },
};
