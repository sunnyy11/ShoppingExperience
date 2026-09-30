import { expect, test } from '@fixtures';
import { buildTestUser, buildRegistrationDetails } from '@data/test-user.factory';

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

  test('deletes a registered user account', async ({ page, registerPage }) => {
    // Registers its own throwaway user rather than borrowing a pooled .env user: deleting a
    // shared pool user would invalidate the cached .auth/worker-N.json storage state of every
    // other test on that worker. Here the deletion is the cleanup, so nothing is left behind.
    const user = buildTestUser();
    const details = buildRegistrationDetails(user);

    await test.step('register a throwaway account to delete', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
      await expect(page.getByRole('heading', { name: 'New User Signup!' })).toBeVisible();

      await registerPage.registerFullAccount(user, details);
      await expect(page.getByRole('heading', { name: 'Account Created!' })).toBeVisible();
      await page.getByRole('link', { name: 'Continue' }).click();
      await expect(page.getByText(`Logged in as ${user.firstName} ${user.lastName}`)).toBeVisible();
    });

    await test.step('delete the account from the logged-in navbar', async () => {
      await page.getByRole('link', { name: 'Delete Account' }).click();
      await expect(page.getByRole('heading', { name: 'Account Deleted!' })).toBeVisible();
      await page.getByRole('link', { name: 'Continue' }).click();
    });

    await test.step('confirm the session is gone', async () => {
      await expect(page.getByRole('link', { name: /signup\s*\/\s*login/i })).toBeVisible();
    });
  });
});
