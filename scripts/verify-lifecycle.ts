import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, resolve, sep } from 'node:path';

interface JsonResult {
  status?: string;
  duration?: number;
}

interface JsonTest {
  results?: JsonResult[];
  expectedStatus?: string;
  projectName?: string;
}

interface JsonSpec {
  title?: string;
  tests?: JsonTest[];
}

interface JsonSuite {
  title?: string;
  file?: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}

interface JsonReport {
  config?: {
    rootDir?: string;
  };
  suites?: JsonSuite[];
  stats?: {
    expected?: number;
    skipped?: number;
    unexpected?: number;
    flaky?: number;
    duration?: number;
  };
}

interface LogRecord {
  level?: string;
  message?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

interface ReportTest {
  key: string;
  title: string;
  statuses: string[];
}

interface LogEntry {
  key: string;
  title: string;
  status: string | undefined;
  worker: unknown;
  retry: unknown;
}

const REPORT_DIR = 'test-results';
const DEFAULT_REPORT_PATH = 'test-results/results.json';
const DEFAULT_LOG_PATH = 'logs/combined.log';
const SPEC_FILE_PATTERN = /\.[cm]?[jt]sx?$/;
const PER_RUN_REPORT_PATTERN = /^results-(.+)\.json$/;

interface ReportFile {
  path: string;
  runId: string | undefined;
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};

  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match?.[1] && match[2] !== undefined) {
      args[match[1]] = match[2];
    }
  }

  return args;
}

/**
 * The report of the most recent run. Every run writes its own file, named
 * after the run id, so a report is never mixed up with the log of another run
 * that happened to share the working directory.
 */
function findReportFile(explicitPath: string | undefined): ReportFile {
  if (explicitPath) {
    const path = resolve(explicitPath);
    const match = PER_RUN_REPORT_PATTERN.exec(path.split(sep).pop() ?? '');

    return { path, runId: match?.[1] };
  }

  const directory = resolve(REPORT_DIR);
  if (existsSync(directory)) {
    const candidates = readdirSync(directory)
      .map((name) => ({ name, path: resolve(directory, name) }))
      .filter((file) => PER_RUN_REPORT_PATTERN.test(file.name))
      .map((file) => ({
        ...file,
        modified: statSync(file.path).mtimeMs,
        runId: PER_RUN_REPORT_PATTERN.exec(file.name)?.[1],
      }))
      .sort((left, right) => right.modified - left.modified);

    const newest = candidates[0];
    if (newest) {
      return { path: newest.path, runId: newest.runId };
    }
  }

  return { path: resolve(DEFAULT_REPORT_PATH), runId: undefined };
}

function normalizePath(filePath: string): string {
  return filePath.split(sep).join('/');
}

function readJsonFile<T>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function collectReportTests(report: JsonReport): ReportTest[] {
  const rootDir = report.config?.rootDir ?? process.cwd();
  const tests: ReportTest[] = [];

  const walk = (suite: JsonSuite, describes: string[]): void => {
    const title = suite.title ?? '';
    const isFileSuite = SPEC_FILE_PATTERN.test(title);
    const file = suite.file
      ? isAbsolute(suite.file)
        ? normalizePath(suite.file)
        : normalizePath(resolve(rootDir, suite.file))
      : '';

    const nextDescribes = isFileSuite ? [] : [...describes, title];

    for (const spec of suite.specs ?? []) {
      const specTitle = spec.title ?? '';
      const key = `${file}::${[...nextDescribes, specTitle].join(' > ')}`;
      const statuses: string[] = [];

      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          if (result.status) {
            statuses.push(result.status);
          }
        }
      }

      tests.push({ key, title: specTitle, statuses });
    }

    for (const child of suite.suites ?? []) {
      walk(child, nextDescribes);
    }
  };

  for (const suite of report.suites ?? []) {
    walk(suite, []);
  }

  return tests;
}

function readLogRecords(logPath: string): LogRecord[] {
  const records: LogRecord[] = [];

  for (const line of readFileSync(logPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) {
      continue;
    }

    try {
      records.push(JSON.parse(trimmed) as LogRecord);
    } catch {
      // A partially written line is skipped; the rotation writes whole lines.
    }
  }

  return records;
}

/**
 * The log file is appended to, so only the records of one run are compared
 * with the report. The run id of the report is taken from the file name when
 * it is available, otherwise the most recent run in the log is used. The run
 * id is published by the global setup and inherited by every worker.
 */
function selectRunRecords(records: LogRecord[], runId: string | undefined): LogRecord[] {
  const lastStart = [...records].reverse().find((record) => record.message === 'test run started');
  const effectiveRunId = runId ?? lastStart?.context?.runId;

  if (typeof effectiveRunId !== 'string') {
    return records;
  }

  return records.filter((record) => record.context?.runId === effectiveRunId);
}

function toLogEntry(record: LogRecord): LogEntry | undefined {
  const context = record.context ?? {};
  const key = context.testKey;
  const title = context.testTitle;

  if (typeof key !== 'string' || typeof title !== 'string') {
    return undefined;
  }

  return {
    key,
    title,
    status: typeof context.status === 'string' ? context.status : undefined,
    worker: context.worker,
    retry: context.retry,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const reportFile = findReportFile(args.report);
  const reportPath = reportFile.path;
  const logPath = resolve(args.log ?? DEFAULT_LOG_PATH);

  if (!existsSync(reportPath)) {
    console.error(`[lifecycle] report not found: ${reportPath}`);
    console.error('[lifecycle] run the suite first, or pass --report=<path>');
    process.exit(1);
  }

  if (!existsSync(logPath)) {
    console.error(`[lifecycle] log file not found: ${logPath}`);
    console.error('[lifecycle] enable file logging with LOG_TO_FILE=true');
    process.exit(1);
  }

  const report = readJsonFile<JsonReport>(reportPath);
  const reportTests = collectReportTests(report);
  const logRecords = selectRunRecords(readLogRecords(logPath), reportFile.runId);

  const started = new Map<string, LogEntry[]>();
  const finished = new Map<string, LogEntry[]>();

  for (const record of logRecords) {
    if (record.message !== 'test started' && record.message !== 'test finished') {
      continue;
    }

    const entry = toLogEntry(record);
    if (!entry) {
      continue;
    }

    const target = record.message === 'test started' ? started : finished;
    const bucket = target.get(entry.key);
    if (bucket) {
      bucket.push(entry);
    } else {
      target.set(entry.key, [entry]);
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const executed = reportTests.filter((test) =>
    test.statuses.some((status) => status !== 'skipped'),
  );
  const skipped = reportTests.filter(
    (test) => test.statuses.length > 0 && test.statuses.every((status) => status === 'skipped'),
  );

  for (const test of executed) {
    if (!started.has(test.key)) {
      errors.push(`missing "test started" record: ${test.title} (${test.key})`);
    }
    if (!finished.has(test.key)) {
      errors.push(`missing "test finished" record: ${test.title} (${test.key})`);
    }
  }

  for (const [key, entries] of finished) {
    if (!started.has(key)) {
      errors.push(`"test finished" without "test started": ${entries[0]?.title ?? key}`);
    }
  }

  for (const [key, entries] of started) {
    if (!finished.has(key)) {
      errors.push(`"test started" without "test finished": ${entries[0]?.title ?? key}`);
    }
  }

  for (const key of started.keys()) {
    if (!reportTests.some((test) => test.key === key)) {
      warnings.push(`log record without a report entry: ${key}`);
    }
  }

  const runStarted = logRecords.some((record) => record.message === 'test run started');
  const runFinished = logRecords.some((record) => record.message === 'test run finished');
  if (!runStarted) {
    errors.push('missing "test run started" record');
  }
  if (!runFinished) {
    errors.push('missing "test run finished" record');
  }

  const stats = report.stats;
  console.log('[lifecycle] report      :', reportPath);
  console.log('[lifecycle] run id      :', reportFile.runId ?? '(from the log)');
  console.log('[lifecycle] log         :', logPath);
  console.log('[lifecycle] executed    :', executed.length, `of ${reportTests.length} tests`);
  console.log('[lifecycle] skipped     :', skipped.length);
  console.log('[lifecycle] start records:', started.size);
  console.log('[lifecycle] end records  :', finished.size);
  if (stats?.duration !== undefined) {
    console.log('[lifecycle] duration    :', Math.round(stats.duration), 'ms');
  }

  for (const warning of warnings) {
    console.warn('[lifecycle] warning:', warning);
  }

  if (errors.length > 0) {
    console.error(`[lifecycle] FAILED with ${errors.length} problem(s):`);
    for (const error of errors) {
      console.error('  -', error);
    }
    process.exit(1);
  }

  console.log('[lifecycle] OK: every executed test has a start and a finish record');
}

main();
