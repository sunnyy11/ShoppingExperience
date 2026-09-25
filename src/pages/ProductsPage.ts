import { type Locator, type Page, expect } from '@playwright/test';

export interface ProductInfo {
  name: string;
  price: string;
}

export class ProductsPage {
  readonly page: Page;
  readonly productsHeading: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchedProductsHeading: Locator;
  readonly productCards: Locator;
  readonly viewCartLink: Locator;
  readonly cartLink: Locator;
  readonly signupLoginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productsHeading = page.getByRole('heading', { name: 'All Products' });
    this.searchInput = page.getByRole('textbox', { name: 'Search Product' });
    this.searchButton = page.locator('#submit_search');
    this.searchedProductsHeading = page.getByRole('heading', { name: 'Searched Products' });
    this.productCards = page.locator('.features_items .col-sm-4');
    this.viewCartLink = page.getByRole('link', { name: 'View Cart' });
    this.cartLink = page.getByRole('link', { name: 'Cart' });
    this.signupLoginLink = page.getByRole('link', { name: /signup\s*\/\s*login/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/products', { waitUntil: 'load' });
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.productsHeading).toBeVisible();
  }

  async search(productName: string): Promise<void> {
    await this.clearOverlays();
    await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.searchInput.fill(productName);
    await this.searchButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.searchButton.click();
    await this.searchedProductsHeading.waitFor({ state: 'visible', timeout: 15000 });
  }

  async getSearchedProductsCount(): Promise<number> {
    return await this.productCards.count();
  }

  async getFirstSearchedProductName(): Promise<string> {
    return await this.productCards.first().locator('p').first().innerText();
  }

  async addProductToCart(index: number): Promise<ProductInfo> {
    const productCard = this.productCards.nth(index);
    const name = await productCard.locator('p').first().innerText();
    const price = await productCard.locator('h2').first().innerText();

    await this.clearOverlays();
    await productCard.hover();

    const addToCartLink = productCard.locator('.overlay-content a.add-to-cart').first();
    await addToCartLink.waitFor({ state: 'visible', timeout: 10000 });

    // Increase timeout for flaky add_to_cart network response
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && /\/add_to_cart\/\d+$/.test(response.url()),
      { timeout: 30000 },
    );
    await addToCartLink.click();
    const response = await responsePromise;

    if (!response.ok()) {
      throw new Error(`Failed to add product ${name} to the cart: HTTP ${response.status()}`);
    }

    await this.page
      .getByRole('heading', { name: 'Added!' })
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => undefined);
    await this.page
      .getByRole('button', { name: 'Continue Shopping' })
      .click({ timeout: 5000 })
      .catch(() => undefined);

    return { name, price };
  }

  async addAllSearchedProductsToCart(): Promise<ProductInfo[]> {
    const count = await this.getSearchedProductsCount();
    const products: ProductInfo[] = [];

    for (let i = 0; i < count; i++) {
      const product = await this.addProductToCart(i);
      products.push(product);
    }

    return products;
  }

  async clearOverlays(): Promise<void> {
    await this.page.evaluate(() => {
      const adSelectors = [
        '.google-auto-placed',
        'ins.adsbygoogle',
        'iframe[id^="aswift"]',
        '.modal-backdrop',
        '#cartModal',
        '.modal-open',
        '.ad-slot',
        'div[id*="google_ads"]',
        'div[class*="ad-container"]',
      ];
      adSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });
      document.querySelector('body')?.classList.remove('modal-open');
    });
  }

  async openCart(): Promise<void> {
    await this.page.goto('/view_cart', { waitUntil: 'load' });
  }

  async openCartFromHeader(): Promise<void> {
    await this.clearOverlays();
    await this.cartLink.click();
  }

  async openSignupLogin(): Promise<void> {
    await this.clearOverlays();
    await this.page.waitForLoadState('domcontentloaded');
    await this.signupLoginLink.waitFor({ state: 'visible', timeout: 15000 });
    await this.signupLoginLink.click();
  }
}
