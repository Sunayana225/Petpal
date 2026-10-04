/**
 * The web API layer — one import path for everything a component needs:
 *
 *   import { ApiError, foodSafetyApi, consoleApi } from '../api';
 */
export * from './client';
export { foodSafetyApi } from './foodSafety';
export { consoleApi } from './console';
