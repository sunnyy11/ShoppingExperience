import { test, expect } from '@playwright/test';
import { OtpLoginPage } from '@pages/OtpLoginPage';
import { generateEmailAddress, waitForEmail } from '@support/mailosaur';

test.setTimeout(120_000);

test.describe('OTP login with Mailosaur email verification', () => {
  test('receives OTP via email and logs in successfully', async ({ page }) => {
    const otpLoginPage = new OtpLoginPage(page);
    const emailAddress = generateEmailAddress();

    await test.step('navigate to OTP login page', async () => {
      await otpLoginPage.goto();
    });

    await test.step('request OTP to Mailosaur inbox', async () => {
      await otpLoginPage.enterEmailAndSend(emailAddress);
    });

    const message = await waitForEmail(emailAddress);

    expect(message.from?.[0]?.name).toContain('Practice');
    expect(message.from?.[0]?.email).toContain('noreply');
    expect(message.subject).toMatch(/otp|verification code/i);

    const body = message.html?.body ?? message.text?.body ?? '';
    const otpMatch = body.match(/OTP code is (\d{6})/i);
    const otp = otpMatch?.[1];
    expect(otp).toBeDefined();

    await test.step('enter OTP and verify login', async () => {
      await otpLoginPage.enterOtpAndVerify(otp!);
      await otpLoginPage.expectSecureArea();
    });
  });
});
