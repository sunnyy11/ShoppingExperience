import { test as base, expect } from '@playwright/test';
import { getUserForWorker, type TestUser } from '@data/test-user';
import { LoginPage } from '@pages/LoginPage';
import { CartPage } from '@pages/CartPage';
import { CheckoutPage } from '@pages/CheckoutPage';
import { ProductsPage } from '@pages/ProductsPage';
import { RegisterPage } from '@pages/RegisterPage';

type Pages = {
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
  productsPage: ProductsPage;
  registerPage: RegisterPage;
};

type WorkerFixtures = {
  workerUser: TestUser;
};

export const test = base.extend<Pages, WorkerFixtures>({
  workerUser: [
    async ({}, use, workerInfo) => {
      await use(getUserForWorker(workerInfo.workerIndex));
    },
    { scope: 'worker' },
  ],

  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
});

test.beforeEach(async ({ page, loginPage, cartPage, workerUser }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
  await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();
  await loginPage.login(workerUser.email, workerUser.password);
  await expect(page.getByText(/Logged in as/i)).toBeVisible();

  await cartPage.clearCart();
});

export { expect };
