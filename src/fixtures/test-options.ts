import { test as base, expect } from '@playwright/test';
import { CartPage } from '@pages/CartPage';
import { CheckoutPage } from '@pages/CheckoutPage';
import { LoginPage } from '@pages/LoginPage';
import { ProductsPage } from '@pages/ProductsPage';
import { RegisterPage } from '@pages/RegisterPage';

type Pages = {
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
  productsPage: ProductsPage;
  registerPage: RegisterPage;
};

export const test = base.extend<Pages>({
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
});

export { expect };
