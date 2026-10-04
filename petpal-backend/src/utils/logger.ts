/**
 * A tiny structured logger — no dependencies.
 *
 * - Levels via `LOG_LEVEL` (default: `debug` in development, `info` in prod).
 * - JSON lines in production (easy to ship to a log aggregator), a readable
 *   line in development.
 * - `child()` binds context (e.g. a requestId) so related lines are greppable.
 * - **Redacts** anything whose key looks sensitive, so an API key or token can
 *   never reach the logs.
 * - Errors are expanded into name/message/stack instead of `{}`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Any meta key matching this is replaced with `[redacted]`. */
const SENSITIVE_KEY = /(pass(word)?|secret|token|api[_-]?key|authorization|cookie|gemini)/i;

export type LogMeta = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  child(bindings: LogMeta): Logger;
}

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? '').toLowerCase() as LogLevel;
  if (configured in LEVELS) return LEVELS[configured];
  return process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug;
}

function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (depth > 4) return '[deep]';
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(item, depth + 1);
    }
    return result;
  }
  return value;
}

function emit(level: LogLevel, message: string, bound: LogMeta, meta?: LogMeta): void {
  if (LEVELS[level] < threshold()) return;

  const payload = redact({ ...bound, ...(meta ?? {}) }) as LogMeta;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (process.env.NODE_ENV === 'production') {
    sink(JSON.stringify({ time: new Date().toISOString(), level, message, ...payload }));
    return;
  }

  const context = Object.keys(payload).length ? ` ${JSON.stringify(payload)}` : '';
  sink(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}${context}`);
}

function build(bound: LogMeta): Logger {
  return {
    debug: (message, meta) => emit('debug', message, bound, meta),
    info: (message, meta) => emit('info', message, bound, meta),
    warn: (message, meta) => emit('warn', message, bound, meta),
    error: (message, meta) => emit('error', message, bound, meta),
    child: (extra) => build({ ...bound, ...extra }),
  };
}

export function createLogger(bindings: LogMeta = {}): Logger {
  return build(bindings);
}

/** The application logger. Bind request context with `.child({ requestId })`. */
export const logger = createLogger({ service: 'petpal' });
