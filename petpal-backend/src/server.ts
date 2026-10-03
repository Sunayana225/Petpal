import type { Server } from 'http';

import dotenv from 'dotenv';

// Load environment variables before anything reads them.
dotenv.config();

import { API_VERSION, createApp } from './app';

const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = createApp();

const server: Server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐾 PetPal API v${API_VERSION} running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📖 API info:     http://localhost:${PORT}/api/info`);
});

/**
 * Drain in-flight requests before exiting so a deploy doesn't cut off anyone
 * mid-response. A hard 10s cap stops a stuck socket from blocking the rollout.
 */
function shutdown(signal: string): void {
  console.log(`\n${signal} received — shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('Forced shutdown: still open after 10s');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close((error) => {
    if (error) {
      console.error('Error while closing server:', error);
      process.exit(1);
    }
    console.log('Shutdown complete.');
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
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

export { app, server };
export default app;
