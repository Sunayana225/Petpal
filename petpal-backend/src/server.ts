import type { Server } from 'http';

import dotenv from 'dotenv';

// Load environment variables before anything reads them.
dotenv.config();

import { API_VERSION, createApp } from './app';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = createApp();

const server: Server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('PetPal API listening', {
    version: API_VERSION,
    environment: NODE_ENV,
    port: PORT,
    health: `http://localhost:${PORT}/api/health`,
  });
});

/**
 * Drain in-flight requests before exiting so a deploy doesn't cut off anyone
 * mid-response. A hard 10s cap stops a stuck socket from blocking the rollout.
 */
function shutdown(signal: string): void {
  logger.info('shutting down gracefully', { signal });

  const forceExit = setTimeout(() => {
    logger.error('forced shutdown: server still open after 10s');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close((error) => {
    if (error) {
      logger.error('error while closing server', { error });
      process.exit(1);
    }
    logger.info('shutdown complete');
    process.exit(0);
  });

  // Drop keep-alive sockets, otherwise close() waits for clients to disconnect.
  const withIdleConnections = server as Server & { closeIdleConnections?: () => void };
  if (typeof withIdleConnections.closeIdleConnections === 'function') {
    withIdleConnections.closeIdleConnections();
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled promise rejection', { error: reason });
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught exception', { error });
  shutdown('uncaughtException');
});

export { app, server };
export default app;
