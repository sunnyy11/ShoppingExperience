import { type Locator, type Page, type Download } from '@playwright/test';

export interface ShippingDetails {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  phone: string;
}

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
  readonly downloadInvoiceButton: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel('Email *');
    this.firstName = page.getByLabel('First Name *');
    this.lastName = page.getByLabel('Last Name *');
    this.company = page.getByLabel('Company');
    this.address = page.getByLabel('Address *');
    this.phone = page.getByLabel('Phone *');
    this.billingAddress = page.getByRole('checkbox', { name: /billing address/i });
    this.payNow = page.getByRole('button', { name: 'Pay and Confirm Order' });
    this.downloadInvoiceButton = page.getByRole('link', { name: 'Download Invoice' });
    this.continueButton = page.getByRole('link', { name: 'Continue' });
  }

  async fillShipping(details: ShippingDetails): Promise<void> {
    await this.email.waitFor({ state: 'visible', timeout: 20000 });
    await this.email.fill(details.email);

    await this.firstName.waitFor({ state: 'visible', timeout: 15000 });
    await this.firstName.fill(details.firstName);

    await this.lastName.fill(details.lastName);
    await this.company.fill(details.company);
    await this.address.fill(details.address);

    const addressOption = this.page.getByRole('option', { name: details.address, exact: true });
    await addressOption.waitFor({ state: 'visible', timeout: 10000 });
    await addressOption.click();

    await this.phone.fill(details.phone);
  }

  async fillPayment(cardDetails: {
    name: string;
    number: string;
    cvc: string;
    month: string;
    year: string;
  }): Promise<void> {
    await this.page.locator('[data-qa="name-on-card"]').fill(cardDetails.name);
    await this.page.locator('[data-qa="card-number"]').fill(cardDetails.number);
    await this.page.locator('[data-qa="cvc"]').fill(cardDetails.cvc);
    await this.page.locator('[data-qa="expiry-month"]').fill(cardDetails.month);
    await this.page.locator('[data-qa="expiry-year"]').fill(cardDetails.year);
  }

  async addOrderMessage(message: string): Promise<void> {
    await this.page.locator('textarea[name="message"]').fill(message);
  }

  async placeOrder(): Promise<void> {
    await this.page.getByRole('link', { name: 'Place Order' }).click();
  }

  async pay(): Promise<void> {
    const payButton = this.payNow.or(this.page.getByRole('button', { name: 'Pay Now' }));
    await payButton.waitFor({ state: 'visible', timeout: 15000 });
    await payButton.click();
  }

  async downloadInvoice(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadInvoiceButton.click();
    return await downloadPromise;
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }
}
