import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.locator('[data-qa="login-email"]');
    this.password = page.locator('[data-qa="login-password"]');
    this.submit = page.getByRole('button', { name: 'Login' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/account/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
