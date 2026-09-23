import { type Locator, type Page } from '@playwright/test';
import { type RegistrationDetails, type TestUser } from '@data/test-user';

export class RegisterPage {
  readonly page: Page;

  // Quick Signup
  readonly signupName: Locator;
  readonly signupEmail: Locator;
  readonly signupButton: Locator;

  // Account Info
  readonly title: Locator;
  readonly fullName: Locator;
  readonly password: Locator;
  readonly dobDay: Locator;
  readonly dobMonth: Locator;
  readonly dobYear: Locator;
  readonly newsletter: Locator;
  readonly partnerOffers: Locator;

  // Address Info
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly company: Locator;
  readonly address1: Locator;
  readonly address2: Locator;
  readonly country: Locator;
  readonly state: Locator;
  readonly city: Locator;
  readonly zipcode: Locator;
  readonly phone: Locator;
  readonly createAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Quick Signup
    this.signupName = page.getByPlaceholder('Name');
    this.signupEmail = page.locator('[data-qa="signup-email"]');
    this.signupButton = page.getByRole('button', { name: 'Signup' });

    // Account Info
    this.title = page.getByLabel('Mr.', { exact: true });
    this.fullName = page.getByLabel('Name *', { exact: true });
    this.password = page.getByLabel('Password *', { exact: true });
    this.dobDay = page.locator('[data-qa="days"]');
    this.dobMonth = page.locator('[data-qa="months"]');
    this.dobYear = page.locator('[data-qa="years"]');
    this.newsletter = page.getByLabel('Sign up for our newsletter!', { exact: true });
    this.partnerOffers = page.getByLabel('Receive special offers from our partners!', {
      exact: true,
    });

    // Address Info
    this.firstName = page.getByLabel('First name *', { exact: true });
    this.lastName = page.getByLabel('Last name *', { exact: true });
    this.company = page.getByLabel('Company', { exact: true });
    this.address1 = page.getByLabel('Address * (Street address, P.O. Box, Company name, etc.)', {
      exact: true,
    });
    this.address2 = page.getByLabel('Address 2', { exact: true });
    this.country = page.locator('[data-qa="country"]');
    this.state = page.getByLabel('State *', { exact: true });
    this.city = page.locator('[data-qa="city"]');
    this.zipcode = page.locator('[data-qa="zipcode"]');
    this.phone = page.getByLabel('Mobile Number *', { exact: true });
    this.createAccountButton = page.getByRole('button', { name: 'Create Account' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/account/register');
  }

  async startQuickSignup(name: string, email: string): Promise<void> {
    await this.signupName.fill(name);
    await this.signupEmail.fill(email);
    await this.signupButton.click();
  }

  async fillAccountDetails(
    user: { firstName: string; lastName: string; password: string },
    dob: { day: string; month: string; year: string },
  ): Promise<void> {
    await this.title.check();
    await this.fullName.fill(`${user.firstName} ${user.lastName}`);
    await this.password.fill(user.password);
    await this.dobDay.selectOption(dob.day);
    await this.dobMonth.selectOption(dob.month);
    await this.dobYear.selectOption(dob.year);
    await this.newsletter.check();
    await this.partnerOffers.check();
  }

  async fillAddressDetails(details: RegistrationDetails): Promise<void> {
    await this.firstName.fill(details.firstName);
    await this.lastName.fill(details.lastName);
    await this.company.fill(details.company);
    await this.address1.fill(details.address1);
    await this.address2.fill(details.address2);
    await this.country.selectOption(details.country);
    await this.state.fill(details.state);
    await this.city.fill(details.city);
    await this.zipcode.fill(details.zipcode);
    await this.phone.fill(details.phone);
    await this.createAccountButton.click();
  }

  async registerFullAccount(user: TestUser, details: RegistrationDetails): Promise<void> {
    await this.startQuickSignup(`${user.firstName} ${user.lastName}`, user.email);
    await this.fillAccountDetails(user, details.dob);
    await this.fillAddressDetails(details);
  }
}
