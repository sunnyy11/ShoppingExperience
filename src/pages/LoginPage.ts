import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByRole('textbox', { name: 'Email Address' });
    this.password = page.getByRole('textbox', { name: 'Password' });
    this.submit = page.getByRole('button', { name: 'Sign In' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/account/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async loginAutomationExercise(email: string, password: string): Promise<void> {
    await this.page.locator('[data-qa="login-email"]').fill(email);
    await this.page.locator('[data-qa="login-password"]').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
