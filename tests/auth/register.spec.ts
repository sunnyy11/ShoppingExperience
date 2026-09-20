import { expect, test } from '@fixtures/test-options';
import { buildTestUser } from '@data/test-user';

test.setTimeout(120_000);

test.describe('Automation Exercise registration', () => {
  test('registers a new user', { tag: '@smoke' }, async ({ page }) => {
    const user = buildTestUser();

      await test.step('open the home page and start signup', async () => {
      await page.goto('/');

      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
      await expect(page.getByRole('heading', { name: 'New User Signup!' })).toBeVisible();
    });

    await test.step('submit the new-user signup form', async () => {
      await page.getByPlaceholder('Name').fill(`${user.firstName} ${user.lastName}`);
      await page.locator('[data-qa="signup-email"]').fill(user.email);
      await page.getByRole('button', { name: 'Signup' }).click();

      await expect(page.getByRole('heading', { name: 'Enter Account Information' })).toBeVisible();
    });

    await test.step('enter account and address information', async () => {
      await page.getByLabel('Mr.', { exact: true }).check();
      await page.getByLabel('Name *', { exact: true }).fill(`${user.firstName} ${user.lastName}`);
      await expect(page.getByLabel('Email *', { exact: true })).toHaveValue(user.email);
      await page.getByLabel('Password *', { exact: true }).fill(user.password);
      await page.locator('[data-qa="days"]').selectOption('10');
      await page.locator('[data-qa="months"]').selectOption('5');
      await page.locator('[data-qa="years"]').selectOption('1990');
      await page.getByLabel('Sign up for our newsletter!', { exact: true }).check();
      await page.getByLabel('Receive special offers from our partners!', { exact: true }).check();

      await page.getByLabel('First name *', { exact: true }).fill(user.firstName);
      await page.getByLabel('Last name *', { exact: true }).fill(user.lastName);
      await page.getByLabel('Company', { exact: true }).fill('Automation Exercise');
      await page
        .getByLabel('Address * (Street address, P.O. Box, Company name, etc.)', { exact: true })
        .fill('123 Test Street');
      await page.getByLabel('Address 2', { exact: true }).fill('Test Building');
      await page.locator('[data-qa="country"]').selectOption('India');
      await page.getByLabel('State *', { exact: true }).fill('Karnataka');
      await page.locator('[data-qa="city"]').fill('Bengaluru');
      await page.locator('[data-qa="zipcode"]').fill('560001');
      await page.getByLabel('Mobile Number *', { exact: true }).fill('9876543210');
      await page.getByRole('button', { name: 'Create Account' }).click();
    });

    await test.step('confirm registration and login', async () => {
      await expect(page.getByRole('heading', { name: 'Account Created!' })).toBeVisible();
      await page.getByRole('link', { name: 'Continue' }).click();
      await expect(page.getByText(`Logged in as ${user.firstName} ${user.lastName}`)).toBeVisible();
    });
  });

test.fixme('deletes a registered user account', async ({ page }) => {
    // Reason: Requires an isolated authenticated-account fixture before account deletion can run independently.
    await page.getByRole('link', { name: 'Delete Account' }).click();
    await expect(page.getByRole('heading', { name: 'Account Deleted!' })).toBeVisible();
    await page.getByRole('link', { name: 'Continue' }).click();
  });
});
