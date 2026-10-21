import { test as base, expect, type TestInfo } from '@playwright/test';
import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { EmailTestingPage } from '@pages/email-testing.page';
import { LoginPage } from '@pages/login.page';
import { OtpLoginPage } from '@pages/otp-login.page';
import { ProductsPage } from '@pages/products.page';
import { RegisterPage } from '@pages/register.page';
import { getUserForWorker, type TestUser } from '@data/test-user.factory';
import { createApiClient } from '@api/api.client';
import { logger as rootLogger, type AppLogger } from '@utils/logger';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Pages = {
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  emailTestingPage: EmailTestingPage;
  loginPage: LoginPage;
  logger: AppLogger;
  otpLoginPage: OtpLoginPage;
  productsPage: ProductsPage;
  registerPage: RegisterPage;
};

type WorkerFixtures = {
  workerUser: TestUser;
  workerAuthFile: string;
};

const authDir = path.join(process.cwd(), '.auth');

function ensureAuthDir(): void {
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
}

function getAuthFile(workerIndex: number): string {
  return path.join(authDir, `worker-${workerIndex}.json`);
}

/**
 * Logger scoped to a single test, so every record carries the spec file,
 * the test title, and the worker that produced it.
 */
export function createTestLogger(testInfo: TestInfo): AppLogger {
  return rootLogger.child({
    testFile: path.basename(testInfo.file),
    testTitle: testInfo.title,
    testPath: testInfo.titlePath.join(' > '),
    project: testInfo.project.name,
    worker: testInfo.workerIndex,
    retry: testInfo.retry,
  });
}

const extendedTest = base.extend<Pages, WorkerFixtures>({
  workerUser: [
    async ({}, use, workerInfo) => {
      await use(getUserForWorker(workerInfo.workerIndex));
    },
    { scope: 'worker' },
  ],

  workerAuthFile: [
    async ({ workerUser }, use, workerInfo) => {
      ensureAuthDir();
      const authFile = getAuthFile(workerInfo.workerIndex);

      // Use existing auth file if available
      if (fs.existsSync(authFile)) {
        rootLogger.info('reusing cached authentication state', {
          worker: workerInfo.workerIndex,
          authFile,
        });
        await use(authFile);
        return;
      }

      // Create new auth state via UI login
      const { chromium } = await import('@playwright/test');
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      rootLogger.info('creating authentication state through a live login', {
        worker: workerInfo.workerIndex,
        email: workerUser.email,
      });

      // Navigate to login page via home page (more reliable)
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
      await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible({
        timeout: 15000,
      });

      // Use data-qa selectors for login form
      await page.locator('[data-qa="login-email"]').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('[data-qa="login-email"]').fill(workerUser.email);
      await page.locator('[data-qa="login-password"]').fill(workerUser.password);
      await page.getByRole('button', { name: 'Login' }).click();

      try {
        await expect(page.getByText(/Logged in as/i)).toBeVisible({ timeout: 20000 });
      } catch {
        // Login failed - user might not exist, try to create account via API
        rootLogger.warn('login failed, creating the pool account through the API', {
          worker: workerInfo.workerIndex,
          email: workerUser.email,
        });

        const apiClient = await createApiClient(page.request);
        await apiClient.createAccount({
          name: `${workerUser.firstName} ${workerUser.lastName}`,
          email: workerUser.email,
          password: workerUser.password,
          title: 'Mr',
          birth_date: '1',
          birth_month: '1',
          birth_year: '1990',
          firstname: workerUser.firstName,
          lastname: workerUser.lastName,
          company: 'Test Company',
          address1: '123 Test St',
          address2: '',
          country: 'United States',
          zipcode: '10001',
          state: 'New York',
          city: 'New York',
          mobile_number: '1234567890',
        });

        // Now try login again
        await page.locator('[data-qa="login-email"]').fill(workerUser.email);
        await page.locator('[data-qa="login-password"]').fill(workerUser.password);
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page.getByText(/Logged in as/i)).toBeVisible({ timeout: 20000 });
      }

      await context.storageState({ path: authFile });
      await browser.close();

      // The state file is kept for the whole run. Playwright restarts a worker
      // after every failure, and a live login costs 20 to 25 seconds, so
      // deleting the file here would repeat that login on every restart. The
      // .auth directory is removed by the global teardown instead.
      await use(authFile);
    },
    { scope: 'worker', timeout: 180_000 },
  ],

  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  emailTestingPage: async ({ page }, use) => use(new EmailTestingPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  logger: async ({}, use, testInfo) => use(createTestLogger(testInfo)),
  otpLoginPage: async ({ page }, use) => use(new OtpLoginPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
});

// The test lifecycle is logged by src/reporters/logging-reporter.ts. A
// beforeEach hook is not used for it: Playwright stops running the hooks of a
// worker once that worker loads a second spec file, which silently drops the
// records of every remaining test in that worker.

// Regular test fixture - no authentication
export const test = extendedTest;

// Authenticated test fixture - uses workerAuthFile for storageState
export const authenticatedTest = extendedTest.extend<Pages, WorkerFixtures>({
  context: async ({ workerAuthFile }, use) => {
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const context = await browser.newContext({ storageState: workerAuthFile });
    await use(context);
    await context.close();
    await browser.close();
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  },
});

export { expect };

// Global teardown
export async function globalTeardown(): Promise<void> {
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }
}
