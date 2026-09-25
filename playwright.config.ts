require('tsconfig-paths/register');

import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,
  timeout: 60_000,
  globalTimeout: process.env.CI ? 1_800_000 : 900_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['blob'],
        ['github'],
        ['junit', { outputFile: 'results.xml' }],
        ['line'],
      ]
    : [['html', { open: 'on-failure' }], ['list']],
  use: {
    baseURL: env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
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
