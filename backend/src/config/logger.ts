/**
 * Structured application logger.
 *
 * Rules:
 *  - One line per event, `key=value` pairs only.
 *  - No leading square brackets: `[Ticketing] ...` breaks when pasted into
 *    PowerShell because it parses `[...]` as a script block / wildcard.
 *  - Values are escaped so a log line can never break the field format.
 *  - Secrets (passwords, tokens, hash secrets) and URL credentials are masked.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MASK = '***';
const SECRET_KEY = /(secret|password|passwd|pwd|token|apikey|api_key|credential)/i;

function configuredLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || '').trim().toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  // Default to info so normal runs stay readable; opt into debug explicitly.
  return 'info';
}

function enabled(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[configuredLevel()];
}

/** Strip user:password from any URL so connection strings are safe to print. */
export function maskUrlCredentials(value: string): string {
  return value.replace(/([a-z][a-z0-9+.-]*:\/\/)[^/@\s]*:[^/@\s]*@/gi, `$1${MASK}:${MASK}@`);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Error) return serializeError(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }
  const text = String(value);
  return /[\s"=]/.test(text) ? JSON.stringify(text) : text;
}

function field(key: string, value: unknown): string {
  const safeKey = key.replace(/[^\w.-]/g, '_');
  const raw = formatValue(value);
  const masked = SECRET_KEY.test(safeKey) ? (raw ? MASK : '') : maskUrlCredentials(raw);
  return `${safeKey}=${masked}`;
}

export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    const extra = error as Error & { code?: unknown; status?: unknown };
    const parts = [`name=${error.name}`, `message=${field('message', error.message)}`];
    if (extra.code) parts.push(`code=${field('code', String(extra.code))}`);
    if (typeof extra.status === 'number') parts.push(`http_status=${String(extra.status)}`);
    if (error.stack) {
      parts.push(`stack=${formatValue(error.stack.split('\n').slice(0, 4).join(' | '))}`);
    }
    return parts.join(' ');
  }
  return field('error', error);
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

function write(
  level: LogLevel,
  scope: string,
  message: string,
  context?: Record<string, unknown>
): void {
  if (!enabled(level)) return;
  const pairs = Object.entries(context || {}).map(([key, value]) => field(key, value));
  const line = [
    new Date().toISOString(),
    level.toUpperCase(),
    `scope=${scope}`,
    `event=${message}`,
    ...pairs,
  ].join(' ');
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, context) => write('debug', scope, message, context),
    info: (message, context) => write('info', scope, message, context),
    warn: (message, context) => write('warn', scope, message, context),
    error: (message, context) => write('error', scope, message, context),
    child: childScope => createLogger(`${scope}.${childScope}`),
  };
}

export const appLogger = createLogger('smartbus');
export default appLogger;
