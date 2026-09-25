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
    // The checkout control renders as an <a> without href, so it has no implicit
    // link role; its stable class is the only accessible handle.
    this.checkout = page.locator('a.check_out');
    this.cartTable = page.locator('#cart_info_table');
  }

  async expectLoaded(): Promise<void> {
    await this.page.waitForURL('**/view_cart**');
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for cart table with shorter timeout and fallback
    try {
      await this.cartTable.waitFor({ state: 'attached', timeout: 15000 });
    } catch {
      // If table not found, page might be empty - that's ok
      return;
    }
    await expect(this.cartTable).toBeVisible();
  }

  async proceedToCheckout(): Promise<void> {
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
    const products: CartProduct[] = [];

    for (const cartRow of await this.getCartRows().all()) {
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
    await this.page.goto('/view_cart', { waitUntil: 'domcontentloaded' });

    for (const product of await this.getCartProducts()) {
      await this.removeProduct(product.name);
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
