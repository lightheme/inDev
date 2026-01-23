import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger';

const workerEntries = [
  'src/workers/scheduler.ts',
  'src/workers/workerRunner.ts',
  'src/workers/autobid.ts',
  'src/workers/cleanup.ts',
];

const startWorker = (entry: string) => {
  const resolved = path.resolve(entry);
  const child = spawn(process.execPath, ['-r', 'ts-node/register', resolved], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      logger.error('Worker exited', { entry, code });
    }
  });

  return child;
};

const children = workerEntries.map(startWorker);

const shutdown = () => {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
