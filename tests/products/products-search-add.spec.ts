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
      await expect(page.getByRole('heading', { name: PRODUCT_NAME, level: 2 })).toBeVisible();
    });

    const productName =
      await test.step('set the product quantity and add it to the cart', async () => {
        const name = await page.getByRole('heading', { name: PRODUCT_NAME, level: 2 }).innerText();

        await page.locator('#quantity').fill(QUANTITY);
        await page.getByRole('button', { name: 'Add to cart' }).click();

        return name;
      });

    await test.step('verify the exact product quantity in the cart', async () => {
      await page.getByRole('link', { name: 'View Cart' }).click();
      await cartPage.expectLoaded();

      const cartProducts = await cartPage.getCartProducts();
      const matchingProduct = cartProducts.find((p) => p.name === productName);
      expect(matchingProduct).toBeDefined();
      const cartRow = page.locator('#cart_info_table tbody tr').filter({ hasText: productName });
      await expect(cartRow.locator('td').nth(3).locator('button')).toHaveText(QUANTITY);
    });
  });

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

  test('adds two products with quantity 2 and verifies price in cart page', async ({
    page,
    productsPage,
    cartPage,
  }) => {
    await test.step('open the home page and navigate to products', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    await test.step('add two products with quantity 2 to the cart', async () => {
      for (let i = 0; i < 2; i++) {
        await page.goto('/');
        await page.getByRole('link', { name: 'Products' }).click();
        await productsPage.goto();

        const productCard = productsPage.productCards.nth(i);
        const name = await productCard.locator('p').nth(0).innerText();
        const productId = await productCard
          .locator('a[data-product-id]')
          .nth(0)
          .getAttribute('data-product-id');

        // Go to product details page
        await page.goto(`/product_details/${productId}`);
        await expect(page.getByRole('heading', { name: name, level: 2 })).toBeVisible();

        // Set quantity to 2
        await page.locator('#quantity').fill('2');
        await page.getByRole('button', { name: 'Add to cart' }).click();

        await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
        await page.getByRole('button', { name: 'Continue Shopping' }).click();
      }
    });

    await test.step('verify price * quantity equals total for each product in cart (qty=2)', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();

      const cartRows = cartPage.cartTable.locator('tbody tr');
      const count = await cartRows.count();
      expect(count).toBe(2);

      for (let i = 0; i < count; i++) {
        const cartRow = cartRows.nth(i);
        const cartProductName = await cartRow.locator('h4').innerText();

        const priceText = await cartRow.locator('td').nth(2).locator('p').innerText();
        console.log(`Raw price text: "${priceText}"`);
        const price = parseFloat(priceText.replace(/[^\d]/g, ''));

        const quantityText = await cartRow.locator('td').nth(3).locator('button').innerText();
        const quantity = parseInt(quantityText, 10);

        const totalText = await cartRow.locator('td').nth(4).locator('p').innerText();
        const total = parseFloat(totalText.replace(/[^\d]/g, ''));

        const expectedTotal = price * quantity;
        console.log(`Product: ${cartProductName}`);
        console.log(`  Price: ${price}`);
        console.log(`  Quantity: ${quantity}`);
        console.log(`  Total: ${total}`);
        console.log(`  Expected Total (price * quantity): ${expectedTotal}`);
        expect(total).toBe(expectedTotal);
        expect(quantity).toBe(2);
      }
    });
  });
});
