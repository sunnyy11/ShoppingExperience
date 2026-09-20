import { type Locator, type Page } from '@playwright/test';

export type Product = 'grey-jacket' | 'noir-jacket' | 'striped-top';

export class StorefrontPage {
  readonly page: Page;
  readonly home: Locator;
  readonly loginLink: Locator;
  readonly logoutLink: Locator;
  readonly checkoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.home = page.getByRole('link', { name: 'Home' }).first();
    this.loginLink = page.getByRole('link', { name: 'Log In' });
    this.logoutLink = page.getByRole('link', { name: /Log out/i });
    this.checkoutLink = page.getByRole('link', { name: 'Check Out' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async openHome(): Promise<void> {
    await this.home.click();
  }

  async openLogin(): Promise<void> {
    await this.loginLink.click();
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  async addProduct(product: Product): Promise<void> {
    await this.page.locator(`a[href="/collections/frontpage/products/${product}"]`).first().click();
    await this.page.getByRole('button', { name: 'Add to Cart' }).click();
  }

  async openCart(): Promise<void> {
    await this.checkoutLink.click();
  }
}
