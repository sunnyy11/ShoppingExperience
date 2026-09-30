import { test, expect } from '@fixtures';
import { getConfiguredUser } from '@data/test-user.factory';

test.describe('Automation Exercise login', () => {
  test('logs in with the registered user and verifies Delete Account is available', async ({
    page,
    loginPage,
  }) => {
    const user = getConfiguredUser();

    await test.step('open the home page and navigate to login', async () => {
      await page.goto('/');

      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
      await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();
    });

    await test.step('log in with the registered credentials', async () => {
      await loginPage.login(user.email, user.password);
      await expect(page.getByText(/Logged in as/i)).toBeVisible();
    });

    await test.step('verify that delete button is visible or not', async () => {
      await expect(page.getByRole('link', { name: 'Delete Account' })).toBeVisible();
    });
  });
});
