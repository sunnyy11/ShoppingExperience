import { getUserForWorker, buildShippingDetails, buildPaymentDetails } from '@data/test-user';
import { expect, test } from '@fixtures/auth.fixture';

test.setTimeout(120_000);

test.describe('Automation Exercise checkout', () => {
  test('places an order after logging in', async ({
    page,
    productsPage,
    cartPage,
    checkoutPage,
    workerUser,
  }) => {
    const user = workerUser;
    const shipping = buildShippingDetails(user);
    const payment = buildPaymentDetails(user);

    await test.step('navigate to products page', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    await test.step('add two products to the cart', async () => {
      for (let i = 0; i < 2; i++) {
        await productsPage.addProductToCart(i);
      }
    });

    await test.step('open the cart and proceed to checkout', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
      await cartPage.proceedToCheckout();

      await expect(page.getByRole('heading', { name: 'Address Details' })).toBeVisible();
    });

    await test.step('place the order with payment details', async () => {
      await checkoutPage.addOrderMessage('Please deliver this order during business hours.');
      await checkoutPage.placeOrder();

      await checkoutPage.fillPayment(payment);

      await checkoutPage.pay();

      await expect(page.getByRole('heading', { name: 'Order Placed!' })).toBeVisible();
      await expect(
        page.getByText(
          /Your order has been placed successfully!|Congratulations! Your order has been confirmed!/,
        ),
      ).toBeVisible();
    });
  });
});
