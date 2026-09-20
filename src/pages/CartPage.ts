import { type Locator, type Page, expect } from '@playwright/test';

export interface ProductInfo {
  name: string;
  price: string;
}

export class CartPage {
  readonly page: Page;
  readonly checkout: Locator;
  readonly cartTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkout = page.getByRole('button', { name: 'Check Out' });
    this.cartTable = page.locator('#cart_info_table');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.cartTable).toBeVisible();
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkout.click();
  }

  async removeProduct(productName: string): Promise<void> {
    const row = this.cartTable.locator('tbody tr').filter({ hasText: productName });
    await row.locator('a[data-product-id]').click();
  }

  async verifyProductRemoved(productName: string): Promise<void> {
    const row = this.cartTable.locator('tbody tr').filter({ hasText: productName });
    await expect(row).toHaveCount(0);
  }

  async getCartRowCount(): Promise<number> {
    return await this.cartTable.locator('tbody tr').count();
  }

  async getCartProducts(): Promise<ProductInfo[]> {
    const cartRows = this.cartTable.locator('tbody tr');
    const count = await cartRows.count();
    const products: ProductInfo[] = [];

    for (let i = 0; i < count; i++) {
      const cartRow = cartRows.nth(i);
      const name = await cartRow.locator('h4').innerText();
      const price = await cartRow.locator('td').nth(2).locator('p').innerText();
      products.push({ name, price });
    }

    return products;
  }

  async verifyCartHasProducts(expectedProducts: ProductInfo[]): Promise<void> {
    for (const product of expectedProducts) {
      const cartRow = this.cartTable.locator('tbody tr').filter({ hasText: product.name });
      await expect(cartRow).toHaveCount(1);
      await expect(cartRow.locator('h4')).toHaveText(product.name);
      await expect(cartRow.locator('td').nth(2).locator('p')).toHaveText(product.price);
    }
  }

  async expectEmpty(): Promise<void> {
    await expect(this.cartTable.locator('tbody tr')).toHaveCount(0);
    await expect(this.page.getByText('Cart is empty!')).toBeVisible();
  }
}
