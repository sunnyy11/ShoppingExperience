import { type Locator, type Page, expect } from '@playwright/test';

const PRODUCT_CARDS = '.features_items .product-image-wrapper';

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
    this.searchInput = page.locator('#search_product');
    this.searchButton = page.locator('#submit_search');
    this.searchedProductsHeading = page.getByRole('heading', { name: 'Searched Products' });
    this.productCards = page.locator(PRODUCT_CARDS);
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
    await this.searchInput.fill(productName);
    await this.searchButton.click();
    await expect(this.searchedProductsHeading).toBeVisible();
  }

  async getSearchedProductsCount(): Promise<number> {
    return await this.productCards.count();
  }

  async getFirstSearchedProductName(): Promise<string> {
    return await this.productCards.locator('.productinfo p').first().innerText();
  }

  async addProductToCart(index: number): Promise<ProductInfo> {
    const productCard = this.productCards.nth(index);
    const productDetails = productCard.locator('.productinfo').first();
    const name = await productDetails.locator('p').innerText();
    const price = await productDetails.locator('h2').innerText();

    await productCard.hover();
    await productCard.locator('.product-overlay a.add-to-cart').evaluate((el: HTMLElement) => el.click());

    const cancelBtn = this.page.getByRole('button', { name: 'Cancel' });
    if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
    }

    await expect(this.page.getByRole('heading', { name: 'Added!' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Continue Shopping' }).click();

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

  async openCart(): Promise<void> {
    await this.page.goto('/view_cart', { waitUntil: 'domcontentloaded' });
  }

  async openCartFromHeader(): Promise<void> {
    await this.cartLink.click();
  }

  async openSignupLogin(): Promise<void> {
    await this.signupLoginLink.click();
  }
}