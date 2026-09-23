import { expect, test } from '@fixtures/pom-fixtures';
import { buildTestUser, buildRegistrationDetails } from '@data/test-user';

test.setTimeout(120_000);

test.describe('Automation Exercise registration', () => {
  test('registers a new user', { tag: '@smoke' }, async ({ page, registerPage }) => {
    const user = buildTestUser();
    const details = buildRegistrationDetails(user);

    await test.step('open the home page and start signup', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
      await expect(page.getByRole('heading', { name: 'New User Signup!' })).toBeVisible();
    });

    await test.step('complete the full registration process', async () => {
      await registerPage.registerFullAccount(user, details);
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
