import { createApp } from './app';
import { connectDatabase } from './config/database';
import { config } from './config/environment';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    const app = createApp();

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server: ', { error });
    process.exit(1);
  }
};

startServer();
