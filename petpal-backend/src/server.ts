import type { Express } from 'express';
import type { Server } from 'http';

// Compatibility entry point. Build the maintained workspace before launching.
// Historical route/service files in this directory are no longer mounted.
const maintained = require('../../apps/backend/dist/index.js') as { app: Express; server: Server };
export const app = maintained.app;
export const server = maintained.server;
export default app;
