import { sep } from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { logger } from '../utils/logger';

interface TestIdentity {
  testFile: string;
  testTitle: string;
  testPath: string;
  testKey: string;
  project: string | undefined;
  worker: number;
  retry: number;
  parallelIndex: number;
  timeoutMs: number;
}

function normalizePath(filePath: string): string {
  return filePath.split(sep).join('/');
}

/**
 * A stable key for a test: the absolute spec file and the describe titles
 * plus the test title. The key is written to every record so that a start
 * and a finish record can be paired without relying on the order of the
 * records in the file.
 */
function buildTestKey(test: TestCase): string {
  const describes: string[] = [];
  let parent: Suite | undefined = test.parent;

  while (parent) {
    if (parent.type === 'describe' && parent.title) {
      describes.unshift(parent.title);
    }
    parent = parent.parent;
  }

  return `${normalizePath(test.location.file)}::${[...describes, test.title].join(' > ')}`;
}

function buildIdentity(test: TestCase, result: TestResult): TestIdentity {
  return {
    testFile: test.location.file,
    testTitle: test.title,
    testPath: test.titlePath().join(' > '),
    testKey: buildTestKey(test),
    project: test.parent.project()?.name,
    worker: result.workerIndex,
    retry: result.retry,
    parallelIndex: result.parallelIndex,
    timeoutMs: test.timeout,
  };
}

/**
 * Writes the test lifecycle to the shared log files. The runner calls these
 * callbacks for every executed test, so the records survive a worker that is
 * killed after a failure. A `beforeEach` hook cannot offer that guarantee:
 * Playwright stops running the hooks of a worker once it loads another spec
 * file, which silently drops the records of the remaining tests.
 */
class LoggingReporter implements Reporter {
  onTestBegin(test: TestCase, result: TestResult): void {
    this.write(
      'info',
      {
        ...buildIdentity(test, result),
        source: 'reporter',
      },
      'test started',
    );
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.write(
      'info',
      {
        ...buildIdentity(test, result),
        source: 'reporter',
        status: result.status,
        expectedStatus: test.expectedStatus,
        durationMs: result.duration,
        errors: result.errors.map((error) => error.message ?? String(error)),
      },
      'test finished',
    );
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    // The run level records are written by the global setup and teardown.
  }

  onEnd(result: FullResult): void {
    if (result.status !== 'passed') {
      logger.error('test run ended with failures', {
        status: result.status,
        durationMs: result.duration,
      });
    }
  }

  private write(level: 'info' | 'error', context: Record<string, unknown>, message: string): void {
    try {
      logger.log(level, message, { ...context });
    } catch {
      // A reporting failure must never break the test run.
    }
  }
}

export default LoggingReporter;
