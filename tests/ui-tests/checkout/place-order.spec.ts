import { buildPaymentDetails } from '@data/test-user.factory';
import { expect, authenticatedTest as test } from '@fixtures';

const CART_PRODUCTS = ['Blue Top', 'Men Tshirt'] as const;

test.describe('Automation Exercise checkout', () => {
  test('places an order after logging in', async ({
    page,
    productsPage,
    cartPage,
    checkoutPage,
    workerUser,
  }) => {
    const user = workerUser;
    const payment = buildPaymentDetails(user);

    await test.step('navigate to products page', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    await test.step('add two products to the cart', async () => {
      for (const productName of CART_PRODUCTS) {
        await productsPage.addProductToCart(productName);
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

  test('verify that user is able to download invoice successfully', async ({
    page,
    productsPage,
    cartPage,
    checkoutPage,
    workerUser,
  }) => {
    const user = workerUser;
    const payment = buildPaymentDetails(user);

    await test.step('navigate to products page', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    await test.step('add two products to the cart', async () => {
      for (const productName of CART_PRODUCTS) {
        await productsPage.addProductToCart(productName);
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

    await test.step('download the invoice and verify it was downloaded', async () => {
      const download = await checkoutPage.downloadInvoice();
      const fileName = await download.suggestedFilename();
      expect(fileName).toMatch(/invoice/i);

      const downloadPath = await download.path();
      expect(downloadPath).not.toBeNull();
    });

    await test.step('click continue', async () => {
      await checkoutPage.clickContinue();
      await expect(page).toHaveURL('/');
    });
  });

  test('verify that delivery and billing address are same', async ({
    page,
    productsPage,
    cartPage,
  }) => {
    await test.step('navigate to products page', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Products' }).click();
      await productsPage.goto();
    });

    await test.step('add products to the cart', async () => {
      for (const productName of CART_PRODUCTS) {
        await productsPage.addProductToCart(productName);
      }
    });

    await test.step('open the cart and proceed to checkout', async () => {
      await productsPage.openCart();
      await cartPage.expectLoaded();
      await cartPage.proceedToCheckout();

      await expect(page.getByRole('heading', { name: 'Address Details' })).toBeVisible();
    });

    await test.step('verify delivery and billing address match', async () => {
      const deliveryAddressSection = page.locator('#address_delivery');
      const billingAddressSection = page.locator('#address_invoice');

      const deliveryText = await deliveryAddressSection.innerText();
      const billingText = await billingAddressSection.innerText();

      const deliveryAddress = deliveryText.replace(/Your delivery address/i, '').trim();
      const billingAddress = billingText.replace(/Your billing address/i, '').trim();

      expect(deliveryAddress).toBe(billingAddress);
    });
  });
});
