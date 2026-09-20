import { getConfiguredUser } from '@data/test-user';
import { expect, test } from '@fixtures/test-options';

test.setTimeout(120_000);

const PRODUCT_CARDS = '.features_items .product-image-wrapper';

test.describe('Automation Exercise checkout', () => {
  test('places an order after logging in', async ({ page }) => {
    const user = getConfiguredUser();

    await test.step('open the home page and log in with the saved credentials', async () => {
      await page.goto('/');

      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
      await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();

      await page.locator('[data-qa="login-email"]').fill(user.email);
      await page.locator('[data-qa="login-password"]').fill(user.password);
      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText(/Logged in as/i)).toBeVisible();
    });

await test.step('add two products to the cart', async () => {
      const productCards = page.locator(PRODUCT_CARDS);

      for (const index of [0, 1]) {
        const productCard = productCards.nth(index);

        await productCard.hover();
        await productCard.locator('.product-overlay a.add-to-cart').evaluate((el: HTMLElement) => el.click());

        const cancelBtn = page.getByRole('button', { name: 'Cancel' });
        if (await cancelBtn.isVisible().catch(() => false)) {
            await cancelBtn.click();
        }

        await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
        await page.getByRole('button', { name: 'Continue Shopping' }).click();
      }
    });

await test.step('open the cart and proceed to checkout', async () => {
      await page.goto('/view_cart', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#cart_info_table')).toBeVisible();
      await page.getByText('Proceed To Checkout', { exact: true }).click();

      await expect(page.getByRole('heading', { name: 'Address Details' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review Your Order' })).toBeVisible();
    });

    await test.step('place the order with payment details', async () => {
      await page
        .locator('textarea[name="message"]')
        .fill('Please deliver this order during business hours.');
      await page.getByRole('link', { name: 'Place Order' }).click();

      await page.locator('[data-qa="name-on-card"]').fill('Automation Test User');
      await page.locator('[data-qa="card-number"]').fill('4111111111111111');
      await page.locator('[data-qa="cvc"]').fill('123');
      await page.locator('[data-qa="expiry-month"]').fill('12');
      await page.locator('[data-qa="expiry-year"]').fill('2030');
      await page.getByRole('button', { name: 'Pay and Confirm Order' }).click();

      await expect(page.getByRole('heading', { name: 'Order Placed!' })).toBeVisible();
      await expect(
        page.getByText(
          /Your order has been placed successfully!|Congratulations! Your order has been confirmed!/,
        ),
      ).toBeVisible();
    });
  });
});


