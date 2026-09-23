import { expect, test } from '@fixtures/auth.fixture';

test.setTimeout(120_000);

test.describe('Automation Exercise products', () => {
  const PRODUCT_NAME = 'Blue Top';
  const QUANTITY = '4';
  const PRODUCT_1_NAME = 'Sleeves Printed Top - White';
  const PRODUCT_2_NAME = 'Pure Cotton Neon Green Tshirt';

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
      await cartPage.clearOverlays();
      for (const product of products) {
        const row = cartPage.getProductRow(product.name);
        await expect(row).toHaveCount(1);
        await expect(row.locator('h4')).toContainText(product.name);
        await expect(row.locator('td.cart_price p')).toContainText(product.price);
      }
    });
  });

  test('removes a product from the cart', async ({ page, productsPage, cartPage }) => {
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

    console.log('First product:', firstProduct);
    console.log('Second product:', secondProduct);

    const products = [firstProduct, secondProduct];

    await test.step('click Cart button and verify cart page is displayed', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
      await cartPage.clearOverlays();
      for (const product of products) {
        const row = cartPage.getProductRow(product.name);
        await expect(row).toHaveCount(1);
        await expect(row.locator('h4')).toContainText(product.name);
        await expect(row.locator('td.cart_price p')).toContainText(product.price);
      }
    });

    await test.step('remove the first product from the cart', async () => {
      await cartPage.removeProduct(firstProduct.name);
    });

    await test.step('verify the first product is removed from the cart', async () => {
      await expect(cartPage.getProductRow(firstProduct.name)).toHaveCount(0);
      const remainingCount = await cartPage.getCartRowCount();
      expect(remainingCount).toBe(products.length - 1);
    });

    await test.step('verify the second product remains in the cart', async () => {
      const row = cartPage.getProductRow(secondProduct.name);
      await expect(row).toHaveCount(1);
      await expect(row.locator('h4')).toContainText(secondProduct.name);
      await expect(row.locator('td.cart_price p')).toContainText(secondProduct.price);
    });

    await test.step('remove the second product from the cart', async () => {
      await cartPage.removeProduct(secondProduct.name);
    });

    await test.step('verify cart is empty', async () => {
      await expect(cartPage.getCartRows()).toHaveCount(0);
      await expect(page.getByText('Cart is empty!')).toBeVisible();
    });
  });

  test('User adds two products Sleeves Printed Top - White and Pure Cotton Neon Green Tshirt with 2 quantity verifies price in cart page', async ({
    page,
    productsPage,
    cartPage,
  }) => {
    await test.step('add two products with quantity 2 to the cart', async () => {
      // Product 1: Sleeves Printed Top - White
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();

      await productsPage.search(PRODUCT_1_NAME);
      const productCard1 = productsPage.productCards.first();
      const name1 = PRODUCT_1_NAME;
      const productId1 =
        (await productCard1
          .locator('a[data-product-id]')
          .first()
          .getAttribute('data-product-id')) ?? '';
      expect(productId1).toBeTruthy();

      await page.goto(`/product_details/${productId1}`);
      await expect(page.locator('h2').filter({ hasText: name1 }).first()).toBeVisible();
      await page.locator('#quantity').fill('2');
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue Shopping' }).click();

      // Product 2: Pure Cotton Neon Green Tshirt
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();

      await productsPage.search(PRODUCT_2_NAME);
      const productCard2 = productsPage.productCards.first();
      const name2 = PRODUCT_2_NAME;
      const productId2 =
        (await productCard2
          .locator('a[data-product-id]')
          .first()
          .getAttribute('data-product-id')) ?? '';
      expect(productId2).toBeTruthy();

      await page.goto(`/product_details/${productId2}`);
      await expect(page.locator('h2').filter({ hasText: name2 }).first()).toBeVisible();
      await page.locator('#quantity').fill('2');
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue Shopping' }).click();
    });

    await test.step('verify price * quantity equals total for each product in cart (qty=2)', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();

      const cartRows = cartPage.cartTable.locator('tbody tr');
      await expect(cartRows).toHaveCount(2);
      const count = await cartRows.count();

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
