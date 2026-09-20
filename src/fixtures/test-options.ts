import { test as base, expect } from '@playwright/test';
import { CartPage } from '@pages/CartPage';
import { CheckoutPage } from '@pages/CheckoutPage';
import { LoginPage } from '@pages/LoginPage';
import { RegisterPage } from '@pages/RegisterPage';
import { StorefrontPage } from '@pages/StorefrontPage';

type Pages = {
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  storefrontPage: StorefrontPage;
};

export const test = base.extend<Pages>({
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  storefrontPage: async ({ page }, use) => use(new StorefrontPage(page)),
});

export { expect };
