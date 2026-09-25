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
  readonly flashMessage: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use ID for specificity - avoids Google ad elements matching getByLabel('Email')
    this.emailInput = page.locator('#email');
    this.sendOtpButton = page.locator('#btn-send-otp');

    this.otpInput = page.locator('#otp');
    this.verifyOtpButton = page.locator('#btn-send-verify');
    this.otpMessage = page.locator('#otp-message');

    this.flashMessage = page.locator('#flash-message');
    this.logoutLink = page.getByRole('link', { name: 'Logout' });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://practice.expandtesting.com/otp-login', {
      waitUntil: 'domcontentloaded',
    });
  }

  async enterEmailAndSend(email: string): Promise<void> {
    await this.emailInput.waitFor({ state: 'visible' });
    await this.emailInput.fill(email);
    await this.sendOtpButton.click({ noWaitAfter: true });
    await this.waitForOtpInput();
  }

  async enterOtpAndVerify(otp: string): Promise<void> {
    await this.otpInput.waitFor({ state: 'visible' });
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click({ noWaitAfter: true });
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
    await expect(this.flashMessage.or(this.otpMessage)).toBeVisible({ timeout: 15_000 });
  }
}
