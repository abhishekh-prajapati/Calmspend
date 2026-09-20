import { app } from './app';
import { envConfig } from './config/env';
import { logger } from './utils/logger';

const PORT = envConfig.port;

app.listen(PORT, () => {
  logger.info(`PBP Account Aggregator Backend running on http://localhost:${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/api/health`);
});
