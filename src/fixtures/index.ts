import { test as base, expect } from '@playwright/test';
import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { LoginPage } from '@pages/login.page';
import { OtpLoginPage } from '@pages/otp-login.page';
import { ProductsPage } from '@pages/products.page';
import { RegisterPage } from '@pages/register.page';
import { getUserForWorker, type TestUser } from '@data/test-user.factory';
import { createApiClient } from '@api/api.client';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Pages = {
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
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
        await use(authFile);
        return;
      }

      // Create new auth state via UI login
      const { chromium } = await import('@playwright/test');
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

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
        console.log(
          `Login failed for ${workerUser.email}, attempting to create account via API...`,
        );

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

      await use(authFile);

      // Teardown: cleanup auth file
      if (fs.existsSync(authFile)) {
        fs.unlinkSync(authFile);
      }
    },
    { scope: 'worker', timeout: 180_000 },
  ],

  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  otpLoginPage: async ({ page }, use) => use(new OtpLoginPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
});

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
