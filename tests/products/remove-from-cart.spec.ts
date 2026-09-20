import { expect, test } from '@fixtures/test-options';

test.setTimeout(120_000);

test.describe('Automation Exercise - Remove Products From Cart', () => {
  test('removes a product from the cart', async ({ page, productsPage, cartPage }) => {
    await test.step('open the home page', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
    });

    const firstProduct = await test.step('add the first product to the cart', async () => {
      return await productsPage.addProductToCart(0);
    });

    const secondProduct = await test.step('add the second product to the cart', async () => {
      return await productsPage.addProductToCart(1);
    });

    const products = [firstProduct, secondProduct];

    await test.step('click Cart button and verify cart page is displayed', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
      await cartPage.verifyCartHasProducts(products);
    });

    await test.step('remove the first product from the cart', async () => {
      await cartPage.removeProduct(firstProduct.name);
    });

    await test.step('verify the first product is removed from the cart', async () => {
      await cartPage.verifyProductRemoved(firstProduct.name);
      const remainingCount = await cartPage.getCartRowCount();
      expect(remainingCount).toBe(products.length - 1);
    });

    await test.step('verify the second product remains in the cart', async () => {
      await cartPage.verifyCartHasProducts([secondProduct]);
    });

    await test.step('remove the second product from the cart', async () => {
      await cartPage.removeProduct(secondProduct.name);
    });

    await test.step('verify cart is empty', async () => {
      await cartPage.expectEmpty();
    });
  });

  });