import { test, expect } from '@fixtures';
import { OauthPage, type OAuthProvider } from '@pages/oauth.page';
import { getGoogleTokens } from '@utils/google-token';

test.describe('OAuth 2.0 social login', () => {
  const PRIMARY_PROVIDER: OAuthProvider = 'google';
  const ALL_PROVIDERS: OAuthProvider[] = ['google', 'github', 'microsoft'];

  test('verifies OAuth 2.0 buttons are present on the login page', async ({ page }) => {
    const oauthPage = new OauthPage(page);

    await test.step('navigate to the login page', async () => {
      await oauthPage.goto();
    });

    await test.step('verify OAuth 2.0 social login buttons are visible', async () => {
      await oauthPage.expectLoginPage();
      await expect(oauthPage.socialLoginButtons).toHaveCount(3);
    });
  });

  test('initiates the OAuth 2.0 authorization code flow', async ({ page }) => {
    const oauthPage = new OauthPage(page);

    await test.step('navigate to the login page', async () => {
      await oauthPage.goto();
    });

    let redirectUrl: string;

    await test.step('click the social login button to start OAuth 2.0', async () => {
      await oauthPage.clickSocialLogin(PRIMARY_PROVIDER);
      await oauthPage.waitForOAuthRedirect(PRIMARY_PROVIDER);
      redirectUrl = page.url();
      expect(redirectUrl).toContain(PRIMARY_PROVIDER);
      expect(redirectUrl).toMatch(/(client_id|redirect_uri|oauth)/i);
    });
  });

  test('obtains Google OAuth tokens via token endpoint (Layer 1)', async () => {
    const tokens = await getGoogleTokens();

    await test.step('verify the access token is valid', async () => {
      expect(tokens.access_token).toBeTruthy();
      expect(tokens.id_token).toBeTruthy();
    });
  });

  for (const provider of ALL_PROVIDERS) {
    test(`verifies OAuth 2.0 redirect for ${provider}`, async ({ page }) => {
      const oauthPage = new OauthPage(page);

      await test.step('navigate to the login page', async () => {
        await oauthPage.goto();
      });

      await test.step('click the social login button and verify provider redirect', async () => {
        await oauthPage.clickSocialLogin(provider);
        await oauthPage.waitForOAuthRedirect(provider);
        await expect(page).toHaveURL(new RegExp(oauthPage.getProviderDomain(provider), 'i'));
      });
    });
  }
});
