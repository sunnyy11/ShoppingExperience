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
    // The search input has no associated <label>, so its stable id is the only handle.
    this.searchButton = page.locator('#submit_search');
    this.searchedProductsHeading = page.getByRole('heading', { name: 'Searched Products' });
    this.productCards = page.locator('.features_items .col-sm-4');
    this.viewCartLink = page.getByRole('link', { name: 'View Cart' });
    this.cartLink = page.getByRole('link', { name: 'Cart' });
    this.signupLoginLink = page.getByRole('link', { name: /signup\s*\/\s*login/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/products', { waitUntil: 'domcontentloaded' });
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.productsHeading).toBeVisible();
  }

  async search(productName: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.searchInput.fill(productName);
    await this.searchButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.searchButton.click();
    await this.searchedProductsHeading.waitFor({ state: 'visible', timeout: 15000 });
  }

  async getSearchedProductsCount(): Promise<number> {
    return await this.productCards.count();
  }

  getProductCard(productName: string): Locator {
    return this.productCards.filter({
      has: this.page.getByText(productName, { exact: true }),
    });
  }

  getProductNameElement(productName: string): Locator {
    // Each card renders the name twice (visible block plus hover overlay), so scope
    // to the non-interactive copy to keep the locator unique.
    return this.getProductCard(productName).locator('.productinfo p');
  }

  getProductPriceElement(productName: string): Locator {
    return this.getProductCard(productName).locator('.productinfo h2');
  }

  async getProductId(productName: string): Promise<string> {
    const href = await this.getProductCard(productName)
      .getByRole('link', { name: 'View Product' })
      .getAttribute('href');

    return href?.split('/').pop() ?? '';
  }

  async gotoProductDetail(productName: string): Promise<void> {
    const productId = await this.getProductId(productName);

    if (!productId) {
      throw new Error(`No product detail link found for "${productName}"`);
    }

    await this.page.goto(`/product_details/${productId}`);
  }

  async addProductToCart(productName: string): Promise<ProductInfo> {
    const listUrl = this.page.url();
    const price = (await this.getProductPriceElement(productName).innerText()).trim();

    await this.gotoProductDetail(productName);
    await expect(this.page.getByRole('heading', { name: productName })).toBeVisible({
      timeout: 15000,
    });

    await this.page.getByRole('button', { name: 'Add to cart' }).click();
    await this.page
      .getByRole('heading', { name: 'Added!' })
      .waitFor({ state: 'visible', timeout: 10000 });
    await this.page.getByRole('button', { name: 'Continue Shopping' }).click();
    await this.page.goto(listUrl, { waitUntil: 'domcontentloaded' });

    return { name: productName, price };
  }

  async addAllSearchedProductsToCart(): Promise<ProductInfo[]> {
    const products: ProductInfo[] = [];

    for (const card of await this.productCards.all()) {
      const name = (await card.locator('.productinfo p').innerText()).trim();
      products.push(await this.addProductToCart(name));
    }

    return products;
  }

  async openCart(): Promise<void> {
    await this.page.goto('/view_cart', { waitUntil: 'domcontentloaded' });
  }

  async openCartFromHeader(): Promise<void> {
    await this.cartLink.click();
  }

  async openSignupLogin(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.signupLoginLink.waitFor({ state: 'visible', timeout: 15000 });
    await this.signupLoginLink.click();
  }
}
