import { expect, test } from '@fixtures/test-options';

test.setTimeout(120_000);

test.describe('Automation Exercise products', () => {
  const PRODUCT_NAME = 'Blue Top';
  const QUANTITY = '4';

  test('searches for a product', async ({ page, productsPage }) => {
    await test.step('open the home page and navigate to products', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    await test.step('search for a product', async () => {
      await productsPage.search(PRODUCT_NAME);
    });

    await test.step('verify the matching products are visible', async () => {
      const count = await productsPage.getSearchedProductsCount();
      expect(count).toBe(1);
      const firstProductName = await productsPage.getFirstSearchedProductName();
      expect(firstProductName).toContain(PRODUCT_NAME);
    });
  });

  test('adds two products to the cart', async ({ page, productsPage, cartPage }) => {
    await test.step('open the home page and navigate to products', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    const firstProduct = await test.step('add the first product to the cart', async () => {
      return await productsPage.addProductToCart(0);
    });

    const secondProduct = await test.step('add the second product to the cart', async () => {
      return await productsPage.addProductToCart(1);
    });

    const products = [firstProduct, secondProduct];

    await test.step('verify both products and their cart totals', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
      await cartPage.verifyCartHasProducts(products);
    });
  });

  test('verifies a product quantity in the cart', async ({ page, productsPage, cartPage }) => {
    await test.step('open a product from the home page', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.goto('/product_details/1');
      await expect(page.locator('.product-information h2')).toBeVisible();
    });

    const productName =
      await test.step('set the product quantity and add it to the cart', async () => {
        const name = await page.locator('.product-information h2').innerText();

        await page.locator('#quantity').fill(QUANTITY);
        await page.getByRole('button', { name: 'Add to cart' }).click();

        return name;
      });

    await test.step('verify the exact product quantity in the cart', async () => {
      await page.getByRole('link', { name: 'View Cart' }).click();
      await cartPage.expectLoaded();

      const cartProducts = await cartPage.getCartProducts();
      const matchingProduct = cartProducts.find(p => p.name === productName);
      expect(matchingProduct).toBeDefined();
      const cartRow = page.locator('#cart_info_table tbody tr').filter({ hasText: productName });
      await expect(cartRow.locator('.cart_quantity button')).toHaveText(QUANTITY);
    });
  });
});