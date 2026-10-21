import { register } from 'tsconfig-paths';

import { defineConfig } from '@playwright/test';
import './src/config/load-env';
import { ensureRunId } from './src/utils/logger';

type RegisterParams = NonNullable<Parameters<typeof register>[0]>;

// The path aliases are registered with an explicit cwd. `tsconfig-paths/register`
// without arguments reads the `--project` flag from `process.argv` and uses it
// as the directory that holds the tsconfig, which collides with the Playwright
// flag of the same name and breaks every command that passes `--project`.
// `baseUrl` and `paths` are optional at runtime but required by the type, so
// the tsconfig.json stays the single source of truth for the aliases.
register({ cwd: __dirname } as RegisterParams);

const baseURL = process.env.BASE_URL ?? 'https://automationexercise.com';

// The JSON report is written per run, so two runs that share the working
// directory cannot overwrite each other's report. The file name carries the
// run id, which is how the lifecycle check pairs the report with the log.
const runId = ensureRunId();
const jsonReportFile = `test-results/results-${runId}.json`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Each worker drives a full Chromium instance, so more workers than logical
  // CPUs makes the live site slower instead of the suite faster. Override with
  // PW_WORKERS=4 when a machine has the headroom.
  workers: process.env.CI ? '50%' : Number(process.env.PW_WORKERS ?? 2),
  timeout: 180_000,
  globalTimeout: 1_800_000,
  expect: { timeout: 10_000 },
  globalSetup: './src/config/global-setup.ts',
  globalTeardown: './src/config/global-teardown.ts',
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['blob'],
        ['github'],
        ['junit', { outputFile: 'results.xml' }],
        ['line'],
        ['json', { outputFile: jsonReportFile }],
        ['./src/reporters/logging-reporter.ts'],
      ]
    : [
        ['html', { open: 'on-failure' }],
        ['list'],
        ['json', { outputFile: jsonReportFile }],
        ['./src/reporters/logging-reporter.ts'],
      ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: null,
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },
  ],

  outputDir: 'test-results/',
});
