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
    this.email = page.getByPlaceholder('Email');
    this.firstName = page.getByPlaceholder('First name (optional)');
    this.lastName = page.getByPlaceholder('Last name');
    this.company = page.getByPlaceholder('Company (optional)');
    this.address = page.getByPlaceholder('Address');
    this.phone = page.getByPlaceholder('Phone (optional)');
    this.billingAddress = page.getByRole('checkbox', { name: /billing address/i });
    this.payNow = page.getByRole('button', { name: 'Pay and Confirm Order' });
    this.downloadInvoiceButton = page.getByRole('link', { name: 'Download Invoice' });
    this.continueButton = page.getByRole('link', { name: 'Continue' });
  }

  async fillShipping(details: ShippingDetails): Promise<void> {
    await this.clearOverlays();

    // Wait for the form to be fully ready
    await this.email.waitFor({ state: 'visible', timeout: 20000 });

    // Use force fill to avoid issues with overlay elements
    await this.email.fill(details.email, { force: true });

    // The first name field can be flaky; we ensure it's visible and use a safer interaction if needed
    await this.firstName.waitFor({ state: 'visible', timeout: 15000 });
    await this.firstName.fill(details.firstName, { force: true });

    await this.lastName.fill(details.lastName, { force: true });
    await this.company.fill(details.company, { force: true });
    await this.address.fill(details.address, { force: true });

    // The address dropdown often takes a moment to appear
    const addressOption = this.page
      .locator('li')
      .getByText(details.address, { exact: true })
      .first();
    await addressOption.waitFor({ state: 'visible', timeout: 10000 });
    await addressOption.click();

    await this.phone.fill(details.phone, { force: true });
  }

  async fillPayment(cardDetails: {
    name: string;
    number: string;
    cvc: string;
    month: string;
    year: string;
  }): Promise<void> {
    await this.clearOverlays();
    await this.page.locator('input[name="name_on_card"]').fill(cardDetails.name);
    await this.page.locator('input[name="card_number"]').fill(cardDetails.number);
    await this.page.locator('input[name="cvc"]').fill(cardDetails.cvc);
    await this.page.locator('input[name="expiry_month"]').fill(cardDetails.month);
    await this.page.locator('input[name="expiry_year"]').fill(cardDetails.year);
  }

  async addOrderMessage(message: string): Promise<void> {
    await this.page.locator('textarea[name="message"]').fill(message);
  }

  async placeOrder(): Promise<void> {
    await this.page.getByRole('link', { name: 'Place Order' }).click();
  }

  async pay(): Promise<void> {
    await this.clearOverlays();
    const payButton = this.payNow.or(this.page.locator('button:has-text("Pay Now")'));
    await payButton.waitFor({ state: 'visible', timeout: 15000 });
    await payButton.click();
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
      ];
      adSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });
      const body = document.querySelector('body');
      if (body) {
        body.classList.remove('modal-open');
        const modal = body.querySelector('.modal-open');
        if (modal) modal.classList.remove('modal-open');
      }
    });
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
