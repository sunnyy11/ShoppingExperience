import { expect, test } from '@fixtures/pom-fixtures';
import { getUserForWorker } from '@data/test-user';

test.setTimeout(120_000);

const SEARCH_TERM = 'Blue Top';

test.describe('Automation Exercise - Search Products and Verify Cart After Login', () => {
  test('search products, add to cart, login and verify cart persists', async ({
    page,
    productsPage,
    cartPage,
  }, testInfo) => {
    const user = getUserForWorker(testInfo.workerIndex);

    await test.step('open the home page', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
    });

    await test.step('click on Products button', async () => {
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    await test.step('verify user is navigated to ALL PRODUCTS page successfully', async () => {
      await productsPage.expectLoaded();
    });

    await test.step('enter product name in search input and click search button', async () => {
      await productsPage.search(SEARCH_TERM);
    });

    await test.step('verify SEARCHED PRODUCTS is visible', async () => {
      await expect(productsPage.searchedProductsHeading).toBeVisible();
    });

    await test.step('verify all the products related to search are visible', async () => {
      const count = await productsPage.getSearchedProductsCount();
      expect(count).toBeGreaterThan(0);
      const firstProductName = await productsPage.getFirstSearchedProductName();
      expect(firstProductName).toContain(SEARCH_TERM);
    });

    let addedProducts: { name: string; price: string }[] = [];

    await test.step('add those products to cart', async () => {
      addedProducts = await productsPage.addAllSearchedProductsToCart();
    });

    await test.step('click Cart button and verify that products are visible in cart', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
      await cartPage.clearOverlays();
      for (const product of addedProducts) {
        const row = cartPage.getProductRow(product.name);
        await expect(row).toHaveCount(1);
        await expect(row.locator('h4')).toContainText(product.name);
        await expect(row.locator('td.cart_price p')).toContainText(product.price);
      }
    });

    await test.step('click Signup / Login button and submit login details', async () => {
      await productsPage.openSignupLogin();
      await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();

      await page.locator('[data-qa="login-email"]').fill(user.email);
      await page.locator('[data-qa="login-password"]').fill(user.password);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText(/Logged in as/i)).toBeVisible();
    });

    await test.step('again, go to Cart page', async () => {
      await productsPage.openCartFromHeader();
      await cartPage.expectLoaded();
    });

    await test.step('verify that those products are visible in cart after login as well', async () => {
      await cartPage.clearOverlays();
      for (const product of addedProducts) {
        const row = cartPage.getProductRow(product.name);
        await expect(row).toHaveCount(1);
        await expect(row.locator('h4')).toContainText(product.name);
        await expect(row.locator('td.cart_price p')).toContainText(product.price);
      }
    });
  });
});
