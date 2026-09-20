import { type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly checkout: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkout = page.getByRole('button', { name: 'Check Out' });
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkout.click();
  }
}
