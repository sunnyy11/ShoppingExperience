import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { Writable } from 'node:stream';
import { format, type Format } from 'logform';
import {
  createLogger as createWinstonLogger,
  transports,
  type Logger as WinstonLogger,
} from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  [key: string]: unknown;
}

export interface LoggerOptions {
  level?: LogLevel;
  consoleLevel?: LogLevel | 'off';
  dir?: string;
  toFile?: boolean;
  bindings?: LogContext;
}

const LOG_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug'];
const DEFAULT_LOG_LEVEL: LogLevel = 'info';
const DEFAULT_LOG_DIR = 'logs';
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

/**
 * Keys whose values must never reach a log file, a console, or a CI artifact.
 * Keys are compared after normalization (lowercase, alphanumeric only), so
 * `client_secret`, `clientSecret`, and `Client Secret` all match.
 */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'password',
  'passwd',
  'pass',
  'pwd',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'secret',
  'clientsecret',
  'secretkey',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'sessiontoken',
  'bearertoken',
  'apikey',
  'apisecret',
  'authorization',
  'auth',
  'authheader',
  'cookie',
  'cookies',
  'setcookie',
  'credential',
  'credentials',
  'privatekey',
  'otp',
  'otpcode',
  'otpsecret',
  'totp',
  'totpsecret',
  'cvc',
  'cvv',
  'cardnumber',
  'cardno',
  'creditcard',
  'pin',
]);

/**
 * Keys whose value is run metadata written by the framework itself. The value
 * space is closed and never contains a secret, so these keys are written to
 * the log verbatim. Without this list the free text patterns would rewrite
 * them, for example the describe title "Basic Email Properties" would become
 * "Basic [REDACTED] Properties" and the record could no longer be matched
 * with the test it belongs to.
 */
const SAFE_KEYS: ReadonlySet<string> = new Set([
  'runid',
  'pid',
  'worker',
  'parallelindex',
  'retry',
  'source',
  'component',
  'project',
  'testfile',
  'testtitle',
  'testpath',
  'testkey',
  'status',
  'expectedstatus',
  'timeoutms',
  'durationms',
  'baseurl',
  'ci',
  'loglevel',
]);

const AUTH_HEADER_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const INLINE_SECRET_PATTERN =
  /\b(password|passwd|pwd|secret|token|api[_-]?key|otp|authorization)(\s*[:=]\s*)("?)([^\s,;)"']+)\3/gi;
const QUERY_SECRET_PATTERN =
  /([?&](?:access_token|refresh_token|id_token|token|api_key|apikey|secret|password|passwd|otp|code)=)([^&\s"'`]+)/gi;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key));
}

function isSafeKey(key: string): boolean {
  return SAFE_KEYS.has(normalizeKey(key));
}

function maskEmail(email: string): string {
  const separatorIndex = email.indexOf('@');
  if (separatorIndex <= 0) {
    return REDACTED;
  }

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);

  return `${localPart.slice(0, 1)}${'*'.repeat(Math.max(localPart.length - 1, 1))}@${domain}`;
}

/**
 * Scrubs secrets and personal identifiers that were embedded in free text,
 * for example a URL that carries an access token.
 */
export function redactText(text: string): string {
  return text
    .replace(AUTH_HEADER_PATTERN, (_match, scheme: string) => `${scheme} ${REDACTED}`)
    .replace(
      INLINE_SECRET_PATTERN,
      (_match, key: string, separator: string) => `${key}${separator}${REDACTED}`,
    )
    .replace(QUERY_SECRET_PATTERN, (_match, prefix: string) => `${prefix}${REDACTED}`)
    .replace(EMAIL_PATTERN, (match) => maskEmail(match));
}

function redactValue(value: unknown, seen: WeakSet<object>, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactText(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message),
      stack: value.stack ? redactText(value.stack) : undefined,
    };
  }

  if (depth >= MAX_DEPTH) {
    return '[TRUNCATED]';
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item, seen, depth + 1));
    }

    const output: LogContext = {};
    for (const [key, item] of Object.entries(value)) {
      if (isSafeKey(key)) {
        output[key] = item;
        continue;
      }

      output[key] = isSensitiveKey(key) ? REDACTED : redactValue(item, seen, depth + 1);
    }

    return output;
  } finally {
    seen.delete(value);
  }
}

/**
 * Redacts a context object in place, so callers can log a payload without
 * hand-picking the fields that are safe to keep.
 */
export function redactSecrets(context: LogContext): LogContext {
  const seen = new WeakSet<object>();
  const output: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (isSafeKey(key)) {
      output[key] = value;
      continue;
    }

    output[key] = isSensitiveKey(key) ? REDACTED : redactValue(value, seen, 0);
  }

  return output;
}

const redactFormat: Format = format((info) => {
  const seen = new WeakSet<object>();

  for (const key of Object.keys(info)) {
    const value = info[key];
    if (value === undefined) {
      continue;
    }
    info[key] = redactValue(value, seen, 0);
  }

  return info;
})();

const baseFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  redactFormat,
);

/**
 * Console output is for people, so it is a single compact line. The full,
 * unabridged record (every field, as JSON) always goes to the log files.
 *
 *   14:02:11 INFO  [W0] [mailosaur] received message | sentTo=f*****@x.net
 *
 * Set LOG_CONSOLE_FORMAT=json to print the full JSON record instead.
 */
const CONSOLE_HIDDEN_KEYS: ReadonlySet<string> = new Set([
  'runid',
  'pid',
  'source',
  'worker',
  'component',
  'testpath',
  'testkey',
  'parallelindex',
  'timeoutms',
  'expectedstatus',
  'error',
  'quiet',
]);

const CONSOLE_KEY_ALIASES: Readonly<Record<string, string>> = {
  durationms: 'duration',
  testtitle: 'test',
  testfile: 'file',
};

const CONSOLE_MAX_VALUE_LENGTH = 100;
const CONSOLE_MAX_STACK_LINES = 6;

const colorizer = format.colorize();

function truncate(text: string, max = CONSOLE_MAX_VALUE_LENGTH): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatConsoleValue(key: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value) && value.length === 0) {
    return undefined;
  }

  const normalized = normalizeKey(key);

  if (normalized === 'retry' && Number(value) === 0) {
    return undefined;
  }
  if (normalized === 'errors' && Array.isArray(value)) {
    const first = String(value[0]).split('\n')[0] ?? '';
    return JSON.stringify(`${value.length}x ${truncate(first)}`);
  }
  if (normalized === 'durationms' && Number.isFinite(Number(value))) {
    return `${(Number(value) / 1000).toFixed(1)}s`;
  }
  if (normalized === 'testfile' && typeof value === 'string') {
    return basename(value.replace(/\\/g, '/'));
  }
  if (typeof value === 'string') {
    const text = truncate(value);
    return /[\s=]/.test(text) ? JSON.stringify(text) : text;
  }
  if (typeof value === 'object') {
    return truncate(JSON.stringify(value));
  }

  return String(value);
}

function formatConsoleError(error: unknown): string {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return `\n    ${truncate(error, 300)}`;
  }
  if (typeof error !== 'object') {
    return `\n    ${String(error)}`;
  }

  const { name, message, stack } = error as { name?: string; message?: string; stack?: string };
  const head = `${name ?? 'Error'}: ${message ?? ''}`.trim();
  const stackLines =
    typeof stack === 'string'
      ? stack
          .split('\n')
          .slice(1, 1 + CONSOLE_MAX_STACK_LINES)
          .map((line) => `\n      ${line.trim()}`)
      : [];

  return [`\n    ${head}`, ...stackLines].join('');
}

function buildPrettyConsoleFormat(): Format {
  const useColor = !process.env.NO_COLOR && resolveBoolean(process.env.LOG_COLOR, true);

  return format.printf((info) => {
    const { level, message, timestamp, context } = info;
    const ctx = (context && typeof context === 'object' ? context : {}) as LogContext;

    const time = String(timestamp).slice(11, 19);
    const paddedLevel = String(level).toUpperCase().padEnd(5);
    const label = useColor ? colorizer.colorize(String(level), paddedLevel) : paddedLevel;

    const worker = ctx.worker;
    const workerTag =
      worker === undefined
        ? ''
        : /^\d+$/.test(String(worker))
          ? ` [W${String(worker)}]`
          : ` [${String(worker)}]`;
    const componentTag = ctx.component ? ` [${String(ctx.component)}]` : '';

    const details = Object.entries(ctx)
      .filter(([key]) => !CONSOLE_HIDDEN_KEYS.has(normalizeKey(key)))
      .map(([key, value]) => {
        const formatted = formatConsoleValue(key, value);
        return formatted === undefined
          ? undefined
          : `${CONSOLE_KEY_ALIASES[normalizeKey(key)] ?? key}=${formatted}`;
      })
      .filter((entry): entry is string => entry !== undefined)
      .join(' ');

    return `${time} ${label}${workerTag}${componentTag} ${String(message)}${
      details ? ` | ${details}` : ''
    }${formatConsoleError(ctx.error)}`;
  });
}

/**
 * Drops records that were logged with `quiet: true` from the console. They
 * still reach the log files, which use their own format.
 */
const dropQuietRecords: Format = format((info) => {
  const context = info.context as LogContext | undefined;
  return context?.quiet === true ? false : info;
})();

function buildConsoleFormat(): Format {
  const output =
    process.env.LOG_CONSOLE_FORMAT?.trim().toLowerCase() === 'json'
      ? format.json()
      : buildPrettyConsoleFormat();

  return format.combine(dropQuietRecords, output);
}

function resolveLevel(value: string | undefined, fallback: LogLevel): LogLevel {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase() as LogLevel;
  return LOG_LEVELS.includes(normalized) ? normalized : fallback;
}

function resolveBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function resolveLogDir(value: string | undefined): string {
  const target = value?.trim() || DEFAULT_LOG_DIR;
  return isAbsolute(target) ? target : resolve(process.cwd(), target);
}

/**
 * Returns the identifier shared by every process of a test run. The first
 * process to ask for it publishes it through the environment so that worker
 * processes inherit the same value.
 */
export function ensureRunId(): string {
  if (!process.env.E2E_RUN_ID) {
    process.env.E2E_RUN_ID = `run-${randomUUID().slice(0, 8)}`;
  }

  return process.env.E2E_RUN_ID;
}

function runtimeMetadata(): LogContext {
  return {
    runId: ensureRunId(),
    pid: process.pid,
    worker: process.env.TEST_WORKER_INDEX ?? 'main',
    source: 'app',
  };
}

/**
 * Thin wrapper around a Winston logger that keeps every payload under a
 * single `context` object and never lets an unredacted value escape.
 */
export class AppLogger {
  constructor(
    private readonly logger: WinstonLogger,
    private readonly bindings: LogContext = {},
  ) {}

  child(bindings: LogContext): AppLogger {
    return new AppLogger(this.logger, { ...this.bindings, ...bindings });
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    this.write(level, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const payload: LogContext = { ...(context ?? {}) };
    if (error !== undefined) {
      payload.error = error;
    }

    this.write('error', message, payload);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    this.logger.log({
      level,
      message,
      context: {
        ...runtimeMetadata(),
        ...this.bindings,
        ...(context ?? {}),
      },
    });
  }
}

export function createLogger(options: LoggerOptions = {}): AppLogger {
  const level = resolveLevel(options.level ?? process.env.LOG_LEVEL, DEFAULT_LOG_LEVEL);
  const consoleLevel = resolveConsoleLevel(
    options.consoleLevel ?? process.env.LOG_CONSOLE_LEVEL,
    level,
  );
  const dir = resolveLogDir(options.dir ?? process.env.LOG_DIR);
  const toFile = options.toFile ?? resolveBoolean(process.env.LOG_TO_FILE, true);

  const loggerTransports = [];

  if (consoleLevel !== 'off') {
    loggerTransports.push(
      new transports.Console({
        level: consoleLevel,
        format: buildConsoleFormat(),
        stderrLevels: ['error'],
      }),
    );
  }

  if (toFile) {
    mkdirSync(dir, { recursive: true });

    loggerTransports.push(
      new transports.Stream({
        stream: createRotatingFileStream(join(dir, 'error.log')),
        level: 'error',
        format: format.json(),
      }),
    );

    loggerTransports.push(
      new transports.Stream({
        stream: createRotatingFileStream(join(dir, 'combined.log')),
        level,
        format: format.json(),
      }),
    );
  }

  const winstonLogger = createWinstonLogger({
    level,
    format: baseFormat,
    transports: loggerTransports,
    exitOnError: false,
  });

  return new AppLogger(winstonLogger, options.bindings ?? {});
}

function resolveConsoleLevel(value: string | undefined, fallback: LogLevel): LogLevel | 'off' {
  if (value && value.trim().toLowerCase() === 'off') {
    return 'off';
  }

  return resolveLevel(value, fallback);
}

/**
 * Appends to the log file synchronously. Playwright kills a worker process as
 * soon as a test fails, and an asynchronous write would lose exactly the
 * records that explain the failure.
 */
function createRotatingFileStream(filename: string): Writable {
  let bytesWritten = existsSync(filename) ? statSync(filename).size : 0;

  const rotate = (): void => {
    for (let index = MAX_FILES - 1; index >= 1; index -= 1) {
      const source = index === 1 ? filename : `${filename}.${index - 1}`;
      const target = `${filename}.${index}`;

      try {
        rmSync(target, { force: true });
        renameSync(source, target);
      } catch {
        // Another worker may be rotating the same file; keep appending.
      }
    }

    bytesWritten = 0;
  };

  return new Writable({
    write(chunk, _encoding, callback) {
      const payload = chunk.toString();
      const size = Buffer.byteLength(payload);

      try {
        if (bytesWritten + size > MAX_FILE_SIZE) {
          rotate();
        }
        appendFileSync(filename, payload, 'utf8');
        bytesWritten += size;
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });
}

/** Shared logger for the whole project. Use `child()` for scoped context. */
export const logger: AppLogger = createLogger();
