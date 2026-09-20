import { type Locator, type Page } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly email: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly company: Locator;
  readonly address: Locator;
  readonly phone: Locator;
  readonly billingAddress: Locator;
  readonly payNow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByPlaceholder('Email');
    this.firstName = page.getByPlaceholder('First name (optional)');
    this.lastName = page.getByPlaceholder('Last name');
    this.company = page.getByPlaceholder('Company (optional)');
    this.address = page.getByPlaceholder('Address');
    this.phone = page.getByPlaceholder('Phone (optional)');
    this.billingAddress = page.getByLabel('Use shipping address as billing address');
    this.payNow = page.getByRole('button', { name: 'Pay now' });
  }

  async fillShipping(email: string): Promise<void> {
    await this.email.fill(email);
    await this.firstName.fill('Test');
    await this.lastName.fill('User');
    await this.company.fill('Test Company');
    await this.address.fill('Vadodara');
    await this.page.locator('li').getByText('Vadodara', { exact: true }).click();
    await this.phone.fill('9876543210');
  }

  async fillPayment(): Promise<void> {
    await this.page.getByLabel(/Card number/i).fill('1');
    await this.page.getByLabel(/Expiration date/i).fill('12/30');
    await this.page.getByLabel(/Security code/i).fill('123');
    await this.page.getByLabel(/Name on card/i).fill('Test User');
  }

  async pay(): Promise<void> {
    await this.billingAddress.check();
    await this.payNow.click();
  }
}
