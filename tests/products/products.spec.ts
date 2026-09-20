import { type Page } from '@playwright/test';
import { expect, test } from '@fixtures/test-options';

const AUTOMATION_EXERCISE_URL = 'https://automationexercise.com/';
const PRODUCT_CARDS = '.features_items .product-image-wrapper';

interface Product {
  name: string;
  price: string;
}

async function addProductToCart(page: Page, index: number): Promise<Product> {
  const productCard = page.locator(PRODUCT_CARDS).nth(index);
  const productDetails = productCard.locator('.productinfo').first();
  const name = await productDetails.locator('p').innerText();
  const price = await productDetails.locator('h2').innerText();

  await productCard.hover();
  await productCard.locator('.product-overlay a.add-to-cart').click();

  if (index === 0) {
    await page.getByRole('button', { name: 'Continue Shopping' }).click();
  }

  return { name, price };
}

test.describe('Automation Exercise products', () => {
  test('searches for a product', async ({ page }) => {
    const productName = 'Blue Top';

    await test.step('open the home page and navigate to products', async () => {
      await page.goto(AUTOMATION_EXERCISE_URL);

      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: 'Products' }).click();
      await page.goto('/products', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'All Products' })).toBeVisible();
    });

    await test.step('search for a product', async () => {
      await page.locator('#search_product').fill(productName);
      await page.locator('#submit_search').click();

      await expect(page.getByRole('heading', { name: 'Searched Products' })).toBeVisible();
    });

    await test.step('verify the matching products are visible', async () => {
      const searchedProducts = page.locator(PRODUCT_CARDS);

      await expect(searchedProducts).toHaveCount(1);
      await expect(searchedProducts.locator('.productinfo p').first()).toHaveText(productName);
    });
  });

  test('adds two products to the cart', async ({ page }) => {
    await test.step('open the home page and navigate to products', async () => {
      await page.goto(AUTOMATION_EXERCISE_URL);

      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: 'Products' }).click();
      await page.goto('/products', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'All Products' })).toBeVisible();
    });

    const firstProduct = await test.step('add the first product to the cart', async () => {
      return await addProductToCart(page, 0);
    });

    const secondProduct = await test.step('add the second product to the cart', async () => {
      return await addProductToCart(page, 1);
    });

    const products = [firstProduct, secondProduct];

    await test.step('verify both products and their cart totals', async () => {
      await page.getByRole('link', { name: 'View Cart' }).click();

      const cartRows = page.locator('#cart_info_table tbody tr');
      await expect(cartRows).toHaveCount(products.length);

      for (const [index, product] of products.entries()) {
        const cartRow = cartRows.nth(index);

        await expect(cartRow.locator('.cart_description h4')).toHaveText(product.name);
        await expect(cartRow.locator('.cart_price p')).toHaveText(product.price);
        await expect(cartRow.locator('.cart_quantity button')).toHaveText('1');
        await expect(cartRow.locator('.cart_total_price')).toHaveText(product.price);
      }
    });
  });

  test('verifies a product quantity in the cart', async ({ page }) => {
    const quantity = '4';

    await test.step('open a product from the home page', async () => {
      await page.goto(AUTOMATION_EXERCISE_URL);

      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: 'View Product' }).first().click();
      await expect(page.locator('.product-information h2')).toBeVisible();
    });

    const productName =
      await test.step('set the product quantity and add it to the cart', async () => {
        const name = await page.locator('.product-information h2').innerText();

        await page.locator('#quantity').fill(quantity);
        await page.getByRole('button', { name: 'Add to cart' }).click();

        return name;
      });

    await test.step('verify the exact product quantity in the cart', async () => {
      await page.getByRole('link', { name: 'View Cart' }).click();

      const cartRow = page.locator('#cart_info_table tbody tr').filter({ hasText: productName });
      await expect(cartRow).toHaveCount(1);
      await expect(cartRow.locator('.cart_quantity button')).toHaveText(quantity);
    });
  });
});
