import { type Locator, type Page, expect } from '@playwright/test';

export type OAuthProvider = 'google' | 'github' | 'microsoft';

const PROVIDER_DOMAINS: Record<OAuthProvider, string> = {
  google: 'accounts.google.com',
  github: 'github.com',
  microsoft: 'login.microsoftonline.com',
};

export class OauthPage {
  readonly page: Page;
  readonly socialLoginButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.socialLoginButtons = page.locator(
      '[data-testid="google"], [data-testid="github"], [data-testid="microsoft"]',
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('https://mailosaur.com/app/login', {
      waitUntil: 'domcontentloaded',
    });
    await this.expectLoginPage();
  }

  async expectLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/.*mailosaur\.com\/.*login.*/);
    await expect(this.page.locator('text=Or login with')).toBeVisible();
    await expect(this.socialLoginButtons).toHaveCount(3);
  }

  getProviderDomain(provider: OAuthProvider): string {
    return PROVIDER_DOMAINS[provider];
  }

  getSocialButton(provider: OAuthProvider): Locator {
    return this.page.locator(`[data-testid="${provider}"]`);
  }

  async clickSocialLogin(provider: OAuthProvider): Promise<void> {
    const button = this.getSocialButton(provider);
    await button.waitFor({ state: 'visible', timeout: 15_000 });
    await button.click();
  }

  async waitForOAuthRedirect(provider: OAuthProvider): Promise<void> {
    const domain = this.getProviderDomain(provider);
    await this.page.waitForURL(`**/${domain}/**`, { timeout: 30_000 });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForOAuthCallback(): Promise<void> {
    await this.page.waitForURL(
      (url) => {
        const pathname = url.pathname;
        return pathname.startsWith('/app/') && !pathname.includes('login');
      },
      { timeout: 60_000 },
    );
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectLoggedIn(): Promise<void> {
    await expect(this.page).not.toHaveURL(/.*login.*/);
    await expect(this.page.locator('[data-testid="headline"]')).not.toBeVisible({
      timeout: 1000,
    });
  }
}
