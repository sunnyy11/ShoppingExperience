import { type Locator, type Page, expect } from '@playwright/test';

export interface OtpLoginData {
  email: string;
  otp: string;
}

export class OtpLoginPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly sendOtpButton: Locator;
  readonly otpInput: Locator;
  readonly verifyOtpButton: Locator;
  readonly otpMessage: Locator;
  readonly otpInfoBox: Locator;
  readonly flashMessage: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Stage 1 — email entry form
    this.emailInput = page.locator('#email');
    this.sendOtpButton = page.locator('#btn-send-otp');

    // Stage 2 — OTP verification form
    this.otpInput = page.locator('#otp');
    this.verifyOtpButton = page.locator('#btn-send-verify');
    this.otpMessage = page.locator('#otp-message');

    // Status / result elements
    this.otpInfoBox = page.locator('.alert-warning');
    this.flashMessage = page.locator('#flash');
    this.logoutLink = page.locator('a[href="/logout"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('https://practice.expandtesting.com/otp-login', {
      waitUntil: 'domcontentloaded',
    });
    await this.clearAds();
  }

  async extractOtpFromPage(): Promise<string | null> {
    await this.otpInfoBox.waitFor({ state: 'visible', timeout: 10_000 });
    const text = await this.otpInfoBox.textContent();
    const match = text?.match(/OTP Code:\s*(\d{6})/);
    return match?.[1] ?? null;
  }

  async enterEmailAndSend(email: string): Promise<void> {
    await this.clearAds();
    await this.emailInput.waitFor({ state: 'visible' });
    await this.emailInput.fill(email);
    await this.sendOtpButton.click();
    await this.waitForOtpInput();
  }

  async enterOtpAndVerify(otp: string): Promise<void> {
    await this.otpInput.waitFor({ state: 'visible' });
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click();
    await this.waitForSecureArea();
  }

  async expectSecureArea(): Promise<void> {
    await expect(this.flashMessage).toContainText(/You logged into a secure area/i);
    await expect(this.logoutLink).toBeVisible();
  }

  async expectOtpError(): Promise<void> {
    await expect(this.otpMessage).toContainText(/incorrect/i);
  }

  private async waitForOtpInput(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.otpInput.waitFor({ state: 'attached', timeout: 15_000 });
    await this.otpInput.waitFor({ state: 'visible' });
  }

  private async waitForSecureArea(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.flashMessage).toBeVisible({ timeout: 15_000 });
  }

  private async clearAds(): Promise<void> {
    await this.page.evaluate(() => {
      const selectors = [
        '.google-auto-placed',
        'ins.adsbygoogle',
        'iframe[id^="aswift"]',
        '.ad-bar',
        '.ad-slot',
        'div[id*="google_ads"]',
      ];
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });
    });
  }
}
