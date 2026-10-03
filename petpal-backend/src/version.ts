/**
 * The API's public version.
 *
 * Kept in its own leaf module so `app.ts`, the health check and the tests can
 * all read the same value without importing each other (which would create a
 * cycle between `app.ts` and `middleware/errorHandler.ts`).
 *
 * Bump whenever the response contract changes.
 */
export const API_VERSION = '2.0.0';
