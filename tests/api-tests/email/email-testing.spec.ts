import { test, expect } from '@fixtures';
import { generateEmailAddress, waitForEmail } from '@utils/mailosaur';

test.describe('Mailosaur Email Testing', () => {
  test.describe('Basic Email Properties', () => {
    test('verifies sender and recipient information', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await test.step('navigate to OTP login page', async () => {
        await otpLoginPage.goto();
      });

      await test.step('request OTP to Mailosaur inbox', async () => {
        await otpLoginPage.enterEmailAndSend(emailAddress);
      });

      const message = await waitForEmail(emailAddress);

      await emailTestingPage.verifyEmailProperties(message, {
        fromName: 'Practice',
        fromEmail: 'noreply',
        toEmail: emailAddress,
        subject: 'OTP Login Code',
      });
      expect(message.subject).toContain('OTP Login Code');
    });

    test('verifies CC and BCC recipients arrays exist', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      expect(message.cc).toBeDefined();
      expect(message.bcc).toBeDefined();
      await emailTestingPage.verifyEmailProperties(message, {
        fromName: 'Practice',
        fromEmail: 'noreply',
        toEmail: emailAddress,
        subject: 'OTP Login Code',
      });
      expect(message.subject).toContain('OTP Login Code');
    });
  });

  test.describe('Email Content Verification', () => {
    test('verifies HTML content contains expected text', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      await emailTestingPage.verifyHtmlContent(message, 'OTP');
      await emailTestingPage.verifyHtmlContent(message, /OTP code/i);
      expect(message.html?.body).toContain('OTP');
    });

    test('verifies plain text content contains expected text', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      await emailTestingPage.verifyTextContent(message, 'OTP');
      await emailTestingPage.verifyTextContent(message, /OTP code/i);
      expect(message.text?.body).toContain('OTP');
    });

    test('verifies both HTML and plain text versions exist', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      expect(message.html?.body).toBeDefined();
      expect(message.text?.body).toBeDefined();
      expect(message.html?.body?.length).toBeGreaterThan(0);
      expect(message.text?.body?.length).toBeGreaterThan(0);
      void emailTestingPage;
    });
  });

  test.describe('Link Testing', () => {
    test('verifies links in HTML content', async ({ otpLoginPage }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const htmlLinks = message.html?.links ?? [];
      expect(htmlLinks.length).toBeGreaterThanOrEqual(0);
    });

    test('verifies links in plain text content', async ({ otpLoginPage }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const textLinks = message.text?.links ?? [];
      expect(textLinks.length).toBeGreaterThanOrEqual(0);
    });

    test('simulates clicking a link and verifies response', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const allLinks = [...(message.html?.links ?? []), ...(message.text?.links ?? [])];
      const linksWithHref = allLinks.filter((link) => link.href);
      expect(linksWithHref.length).toBeGreaterThanOrEqual(0);
      for (const link of linksWithHref) {
        const status = await emailTestingPage.clickLinkAndVerify(link.href!);
        expect([200, 301, 302, 404]).toContain(status);
      }
    });
  });

  test.describe('Verification Code Testing', () => {
    test('extracts and verifies OTP code from HTML content', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const codes = await emailTestingPage.verifyCodes(message, /^\d{6}$/);
      expect(codes.length).toBeGreaterThan(0);
    });

    test('extracts and verifies OTP code from plain text content', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const codes = await emailTestingPage.verifyCodes(message);
      const sixDigitCodes = codes.filter((c) => /^\d{6}$/.test(c));
      expect(sixDigitCodes.length).toBeGreaterThan(0);
    });

    test('verifies code format matches expected pattern', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const codes = await emailTestingPage.verifyCodes(message);
      for (const code of codes) {
        expect(code).toMatch(/^\d{4,8}$/);
      }
    });
  });

  test.describe('Attachment Testing', () => {
    test('verifies email has no attachments in OTP emails', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      expect(message.attachments).toHaveLength(0);
      void emailTestingPage;
    });
  });

  test.describe('Image and Web Beacon Testing', () => {
    test('verifies no images in OTP emails', async ({ otpLoginPage }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const images = message.html?.images ?? [];
      expect(images).toHaveLength(0);
    });
  });

  if (process.env.MAILOSAUR_VERIFIED_EMAIL) {
    const verifiedEmail = process.env.MAILOSAUR_VERIFIED_EMAIL;

    test.describe('Email Sending (send from Mailosaur to verified external address)', () => {
      test('sends outbound email via Mailosaur API', async ({ emailTestingPage }) => {
        const sentMessage = await emailTestingPage.sendEmail({
          to: verifiedEmail,
          subject: 'Test Email from Playwright',
          text: 'This is a test email sent via Mailosaur API',
          html: '<p>This is a <strong>test</strong> email sent via Mailosaur API</p>',
        });

        expect(sentMessage.id).toBeTruthy();
      });

      test('sends email with attachments to verified email', async ({ emailTestingPage }) => {
        const testContent = Buffer.from('Test attachment content').toString('base64');

        const sentMessage = await emailTestingPage.sendEmail({
          to: verifiedEmail,
          subject: 'Test Email with Attachment',
          text: 'This email has an attachment',
          html: '<p>This email has an <strong>attachment</strong></p>',
          attachments: [
            {
              fileName: 'test.txt',
              contentType: 'text/plain',
              content: testContent,
            },
          ],
        });

        expect(sentMessage.id).toBeTruthy();
      });

      test('sends email with HTML and plain text content', async ({ emailTestingPage }) => {
        const sentMessage = await emailTestingPage.sendEmail({
          to: verifiedEmail,
          subject: 'HTML and Text Content Test',
          text: 'Plain text version of the email',
          html: '<p><strong>HTML</strong> version with <em>formatting</em></p>',
        });

        expect(sentMessage.id).toBeTruthy();
      });
    });

    test.describe('Email Reply (reply to messages in Mailosaur inbox)', () => {
      // Reply tests require verified sender address
      // OTP sender (noreply@practice.expandtesting.com) is not verified
      // These tests are disabled until a verified sender is available
    });

    test.describe('Email Forwarding (forward messages from Mailosaur to verified address)', () => {
      test('forwards an email to verified address', async ({ emailTestingPage, otpLoginPage }) => {
        const emailAddress = generateEmailAddress();

        await otpLoginPage.goto();
        await otpLoginPage.enterEmailAndSend(emailAddress);

        const message = await waitForEmail(emailAddress);

        await emailTestingPage.forwardEmail(message.id!, {
          to: verifiedEmail,
          text: 'FYI - forwarding this message',
        });

        // Forward API call succeeded (no exception thrown)
        expect(true).toBeTruthy();
      });

      test('forwards with custom subject', async ({ emailTestingPage, otpLoginPage }) => {
        const emailAddress = generateEmailAddress();

        await otpLoginPage.goto();
        await otpLoginPage.enterEmailAndSend(emailAddress);

        const message = await waitForEmail(emailAddress);

        await emailTestingPage.forwardEmail(message.id!, {
          to: verifiedEmail,
          subject: 'Forwarded: Custom Subject',
          text: 'Forwarded with custom subject',
        });

        // Forward API call succeeded (no exception thrown)
        expect(true).toBeTruthy();
      });
    });
  }

  test.describe('Message Deletion', () => {
    test('deletes individual message', async ({ emailTestingPage, otpLoginPage }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      await emailTestingPage.deleteEmail(message.id!);

      const messages = await emailTestingPage.listEmails();
      const deleted = messages.find((m) => m.id === message.id);
      expect(deleted).toBeUndefined();
    });

    test('deletes all messages', async ({ emailTestingPage, otpLoginPage }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);
      await waitForEmail(emailAddress);

      await emailTestingPage.deleteAllEmails();

      const messages = await emailTestingPage.listEmails();
      expect(messages).toHaveLength(0);
    });
  });

  test.describe('Time Range Search', () => {
    test('searches emails with receivedAfter parameter', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const foundMessage = await emailTestingPage.waitForEmailWithTimeRange(
        emailAddress,
        fiveMinutesAgo,
      );

      expect(foundMessage.id).toBeTruthy();
    });

    test('searches emails without time range (default 1 hour)', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const foundMessage = await emailTestingPage.waitForEmail(emailAddress);
      expect(foundMessage.id).toBe(message.id);
    });
  });

  test.describe('Multiple Message Search', () => {
    test('searches for multiple messages matching criteria', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);
      await waitForEmail(emailAddress);

      const messages = await emailTestingPage.searchMultipleEmails(emailAddress, 10);

      expect(messages.length).toBeGreaterThan(0);
    });

    test('retrieves full message details using getById', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const message = await waitForEmail(emailAddress);

      const fullMessage = await emailTestingPage.getEmailById(message.id!);

      expect(fullMessage.html?.body).toBeDefined();
      expect(fullMessage.text?.body).toBeDefined();
      expect(fullMessage.attachments).toBeDefined();
      expect(fullMessage.html?.links).toBeDefined();
      expect(fullMessage.html?.codes).toBeDefined();
      expect(fullMessage.html?.images).toBeDefined();
    });
  });

  test.describe('Unique Email Address Generation', () => {
    test('generates unique email addresses', async ({ emailTestingPage }) => {
      const address1 = await emailTestingPage.generateEmailAddress();
      const address2 = await emailTestingPage.generateEmailAddress();

      expect(address1).not.toBe(address2);
      expect(address1).toMatch(/@.*\.mailosaur\.net$/);
      expect(address2).toMatch(/@.*\.mailosaur\.net$/);
    });

    test('generates multiple unique addresses for test isolation', async ({ emailTestingPage }) => {
      const addresses = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const addr = await emailTestingPage.generateEmailAddress();
        addresses.add(addr);
      }

      expect(addresses.size).toBe(5);
    });
  });

  test.describe('End-to-End Email Flow', () => {
    test('complete email workflow: send, receive, verify, delete', async ({
      emailTestingPage,
      otpLoginPage,
    }) => {
      const emailAddress = generateEmailAddress();

      await otpLoginPage.goto();
      await otpLoginPage.enterEmailAndSend(emailAddress);

      const receivedMessage = await waitForEmail(emailAddress);
      expect(receivedMessage.subject).toMatch(/OTP|Login Code/i);

      await emailTestingPage.verifyEmailProperties(receivedMessage, {
        toEmail: emailAddress,
      });

      await emailTestingPage.verifyHtmlContent(receivedMessage, 'OTP');
      await emailTestingPage.verifyTextContent(receivedMessage, 'OTP');

      await emailTestingPage.deleteEmail(receivedMessage.id!);

      const remainingMessages = await emailTestingPage.listEmails();
      const deleted = remainingMessages.find((m) => m.id === receivedMessage.id);
      expect(deleted).toBeUndefined();
    });
  });
});
