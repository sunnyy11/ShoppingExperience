import { test, expect } from '@fixtures';
import { OauthPage } from '@pages/oauth.page';
import { generateTotp } from '@utils/totp';

const GOOGLE_EMAIL = process.env.GOOGLE_TEST_EMAIL ?? process.env.OAUTH_GOOGLE_USERNAME;
const GOOGLE_PASSWORD = process.env.GOOGLE_TEST_PASSWORD ?? process.env.OAUTH_GOOGLE_PASSWORD;
const GOOGLE_OTP_SECRET = process.env.GOOGLE_TEST_OTP_SECRET ?? '';

test.describe('OAuth 2.0 smoke tests (Layer 2 - real Google UI)', () => {
  test('logs into Mailosaur via Google OAuth', { tag: '@smoke' }, async ({ page }) => {
    test.fixme(
      !GOOGLE_EMAIL || !GOOGLE_PASSWORD,
      'Set GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD to run this smoke test',
    );

    const oauthPage = new OauthPage(page);

    await test.step('navigate to Mailosaur login page', async () => {
      await oauthPage.goto();
    });

    await test.step('click the Google social login button', async () => {
      await oauthPage.clickSocialLogin('google');
      await oauthPage.waitForOAuthRedirect('google');
      await expect(page).toHaveURL(/accounts\.google\.com/i);
    });

    await test.step('enter Google email and click Next', async () => {
      const emailInput = page.locator(
        'input[type="email"], input[name="identifier"], input[name="email"]',
      );
      const nextButton = page.getByRole('button', { name: /^next$/i });

      await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
      await emailInput.fill(GOOGLE_EMAIL!);
      await nextButton.waitFor({ state: 'visible', timeout: 10_000 });
      await nextButton.click();
    });

    await test.step('enter Google password and click Next', async () => {
      const passwordInput = page.locator('input[type="password"]:not([name^="hidden"])');
      const nextButton = page.getByRole('button', { name: /^next$|^sign in$/i });

      await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
      await passwordInput.fill(GOOGLE_PASSWORD!);
      await nextButton.waitFor({ state: 'visible', timeout: 10_000 });
      await nextButton.click();

      try {
        const consentButton = page.getByRole('button', { name: /allow/i });
        await consentButton.waitFor({ state: 'visible', timeout: 10_000 });
        await consentButton.click();
      } catch {
        // No consent screen appeared
      }
    });

    await test.step('handle 2FA if prompted', async () => {
      const otpInput = page.getByLabel(/enter.*code|verification code/i);
      try {
        await otpInput.waitFor({ state: 'visible', timeout: 10_000 });
        await otpInput.fill(generateTotp(GOOGLE_OTP_SECRET));
        const verifyButton = page.getByRole('button', { name: /next|verify|sign.?in/i });
        await verifyButton.waitFor({ state: 'visible', timeout: 10_000 });
        await verifyButton.click();
      } catch {
        // No 2FA prompt appeared or no OTP secret set
      }
    });

    await test.step('verify successful OAuth login to Mailosaur', async () => {
      await oauthPage.waitForOAuthCallback();
      await oauthPage.expectLoggedIn();
    });
  });
});
