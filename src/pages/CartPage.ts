import { type Locator, type Page, expect } from '@playwright/test';

export interface ProductInfo {
  name: string;
  price: string;
}

export interface CartProduct extends ProductInfo {
  quantity: number;
  total: string;
}

export class CartPage {
  readonly page: Page;
  readonly checkout: Locator;
  readonly cartTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkout = page
      .locator(
        'a.check_out, a:has-text("Proceed To Checkout"), button:has-text("Proceed To Checkout")',
      )
      .first();
    this.cartTable = page.locator('#cart_info_table');
  }

  async expectLoaded(): Promise<void> {
    await this.page.waitForURL('**/view_cart**');
    await this.page.waitForLoadState('load');

    // Force remove any persistent overlays
    await this.clearOverlays();

    try {
      await this.cartTable.waitFor({ state: 'attached', timeout: 30000 });
    } catch {
      // If the table isn't found, reload the page once.
      // This often fixes session-related loading issues on this site.
      await this.page.reload({ waitUntil: 'load' });
      await this.page.waitForURL('**/view_cart**');
      await this.page.waitForLoadState('load');
      await this.clearOverlays();
      await this.cartTable.waitFor({ state: 'attached', timeout: 30000 });
    }

    await expect(this.cartTable).toBeVisible();
  }

  async clearOverlays(): Promise<void> {
    await this.page.evaluate(() => {
      const overlays = document.querySelectorAll(
        '.modal-backdrop, .modal-open, #cartModal, .google-auto-placed',
      );
      overlays.forEach((el) => el.remove());
      const body = document.querySelector('body');
      if (body) {
        body.classList.remove('modal-open');
      }
    });
  }

  async proceedToCheckout(): Promise<void> {
    await this.clearOverlays();
    await this.cartTable.waitFor({ state: 'visible', timeout: 15000 });
    await this.checkout.waitFor({ state: 'visible', timeout: 15000 });
    await this.checkout.click();
  }

  async removeProduct(productName: string): Promise<void> {
    const row = this.cartTable.locator('tbody tr').filter({ hasText: productName });
    const rowCountBefore = await this.cartTable.locator('tbody tr').count();
    const deleteLink = row.locator('a[data-product-id]');
    await deleteLink.click();
    await this.waitForCartRowCountBelow(rowCountBefore);
  }

  async getCartRowCount(): Promise<number> {
    return await this.cartTable.locator('tbody tr').count();
  }

  async getCartProducts(): Promise<CartProduct[]> {
    const cartRows = this.cartTable.locator('tbody tr');
    const count = await cartRows.count();
    const products: CartProduct[] = [];

    for (let i = 0; i < count; i++) {
      const cartRow = cartRows.nth(i);
      const name = await cartRow.locator('h4').innerText();
      const price = await cartRow.locator('td.cart_price p').innerText();
      const quantityText = await cartRow.locator('td.cart_quantity button').innerText();
      const total = await cartRow.locator('td.cart_total p').innerText();
      products.push({ name, price, quantity: parseInt(quantityText, 10), total });
    }

    return products;
  }

  getProductRow(productName: string): Locator {
    const normalizedName = productName
      .replace(/\s+/g, ' ')
      .replace(/\u00A0/g, ' ')
      .trim();
    return this.cartTable.locator('tbody tr').filter({ hasText: normalizedName });
  }

  getCartRows(): Locator {
    return this.cartTable.locator('tbody tr');
  }

  async clearCart(): Promise<void> {
    await this.page.goto('/view_cart', { waitUntil: 'load' });
    await this.clearOverlays();

    while ((await this.getCartRowCount()) > 0) {
      const rowCount = await this.getCartRowCount();
      const deleteLink = this.cartTable.locator('tbody tr').first().locator('a[data-product-id]');
      await deleteLink.click();
      await this.waitForCartRowCountBelow(rowCount);
      await this.clearOverlays();
    }
  }

  private async waitForCartRowCountBelow(target: number, timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      (data: { selector: string; count: number }) =>
        document.querySelectorAll(data.selector).length < data.count,
      { selector: '#cart_info_table tbody tr', count: target },
      { timeout },
    );
  }
}
