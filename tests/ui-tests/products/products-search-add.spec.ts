import { expect, test } from '@fixtures';

test.describe('Automation Exercise products', () => {
  const PRODUCT_NAME = 'Blue Top';
  const PRODUCT_1_NAME = 'Sleeves Printed Top - White';
  const PRODUCT_2_NAME = 'Pure Cotton Neon Green Tshirt';
  const TWO_PRODUCTS = ['Blue Top', 'Men Tshirt'] as const;

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
      expect(count).toBeGreaterThanOrEqual(1);
      await expect(productsPage.getProductCard(PRODUCT_NAME)).toHaveCount(1);
      await expect(productsPage.getProductNameElement(PRODUCT_NAME)).toHaveText(PRODUCT_NAME);
    });
  });

  test('adds two products to the cart', async ({ page, productsPage, cartPage }) => {
    await test.step('open the home page and navigate to products', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    const [firstProductName, secondProductName] = TWO_PRODUCTS;

    const firstProduct = await test.step('add the first product to the cart', async () => {
      return await productsPage.addProductToCart(firstProductName);
    });

    const secondProduct = await test.step('add the second product to the cart', async () => {
      return await productsPage.addProductToCart(secondProductName);
    });

    const products = [firstProduct, secondProduct];

    await test.step('verify both products and their cart totals', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
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

    const [firstProductName, secondProductName] = TWO_PRODUCTS;

    const firstProduct = await test.step('add the first product to the cart', async () => {
      return await productsPage.addProductToCart(firstProductName);
    });

    const secondProduct = await test.step('add the second product to the cart', async () => {
      return await productsPage.addProductToCart(secondProductName);
    });

    const products = [firstProduct, secondProduct];

    await test.step('click Cart button and verify cart page is displayed', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
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

  test('adds a product with quantity 2 from product detail page', async ({
    page,
    productsPage,
    cartPage,
  }) => {
    await test.step('search for product and open detail page', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();

      await productsPage.search(PRODUCT_1_NAME);
      await expect(productsPage.getProductCard(PRODUCT_1_NAME)).toHaveCount(1);

      await productsPage.gotoProductDetail(PRODUCT_1_NAME);
      await expect(page.getByRole('heading', { name: PRODUCT_1_NAME })).toBeVisible();
    });

    await test.step('add product with quantity 2 to cart', async () => {
      await page.locator('#quantity').fill('2');
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue Shopping' }).click();
    });

    await test.step('verify product in cart with correct quantity and total', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();

      const row = cartPage.getProductRow(PRODUCT_1_NAME);
      await expect(row).toHaveCount(1);

      const priceText = await row.locator('td.cart_price p').innerText();
      const price = parseFloat(priceText.replace(/[^\d]/g, ''));

      const quantityText = await row.locator('td.cart_quantity button').innerText();
      const quantity = parseInt(quantityText, 10);

      const totalText = await row.locator('td.cart_total p').innerText();
      const total = parseFloat(totalText.replace(/[^\d]/g, ''));

      expect(quantity).toBe(2);
      expect(total).toBe(price * 2);
    });
  });

  test('adds two products with quantity 2 and verifies cart totals', async ({
    page,
    productsPage,
    cartPage,
  }) => {
    await test.step('add first product with quantity 2', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();

      await productsPage.search(PRODUCT_1_NAME);
      await expect(productsPage.getProductCard(PRODUCT_1_NAME)).toHaveCount(1);

      await productsPage.gotoProductDetail(PRODUCT_1_NAME);
      await expect(page.getByRole('heading', { name: PRODUCT_1_NAME })).toBeVisible();
      await page.locator('#quantity').fill('2');
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue Shopping' }).click();
    });

    await test.step('add second product with quantity 2', async () => {
      // Navigate back to products page from current state
      await productsPage.goto();

      await productsPage.search(PRODUCT_2_NAME);
      await expect(productsPage.getProductCard(PRODUCT_2_NAME)).toHaveCount(1);

      await productsPage.gotoProductDetail(PRODUCT_2_NAME);
      await expect(page.getByRole('heading', { name: PRODUCT_2_NAME })).toBeVisible();
      await page.locator('#quantity').fill('2');
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue Shopping' }).click();
    });

    await test.step('verify price * quantity equals total for each product in cart', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
      await expect(cartPage.getCartRows()).toHaveCount(2);

      for (const productName of [PRODUCT_1_NAME, PRODUCT_2_NAME]) {
        const cartRow = cartPage.getProductRow(productName);
        await expect(cartRow).toHaveCount(1);

        const priceText = await cartRow.locator('td.cart_price p').innerText();
        const price = parseFloat(priceText.replace(/[^\d]/g, ''));

        const quantityText = await cartRow.locator('td.cart_quantity button').innerText();
        const quantity = parseInt(quantityText, 10);

        const totalText = await cartRow.locator('td.cart_total p').innerText();
        const total = parseFloat(totalText.replace(/[^\d]/g, ''));

        const expectedTotal = price * quantity;
        expect(total).toBe(expectedTotal);
        expect(quantity).toBe(2);
      }
    });
  });
});
