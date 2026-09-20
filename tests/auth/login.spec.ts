import { test, expect } from '@fixtures/test-options';
import { getConfiguredUser } from '@data/test-user';

const AUTOMATION_EXERCISE_URL = 'https://automationexercise.com/';

test.describe('Automation Exercise login', () => {
  test('logs in with the registered user and verifies Delete Account is available', async ({
    page,
  }) => {
    const user = getConfiguredUser();

    await test.step('open the home page and navigate to login', async () => {
      await page.goto(AUTOMATION_EXERCISE_URL);

      await expect(page).toHaveTitle(/Automation Exercise/i);
      await page.getByRole('link', { name: /signup\s*\/\s*login/i }).click();
      await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();
    });

    await test.step('log in with the registered credentials', async () => {
      await page.locator('[data-qa="login-email"]').fill(user.email);
      await page.locator('[data-qa="login-password"]').fill(user.password);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText(/Logged in as/i)).toBeVisible();
    });

    await test.step('verify that delete button is visible or not', async () => {
      await expect(page.getByRole('link', { name: 'Delete Account' })).toBeVisible();
    });
  });
});
