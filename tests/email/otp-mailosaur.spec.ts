import { test, expect } from '@fixtures';
import { generateEmailAddress, waitForEmail } from '@utils/mailosaur';

test.describe('OTP login with Mailosaur email verification', () => {
  test('receives OTP via email and logs in successfully', async ({ otpLoginPage }) => {
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
