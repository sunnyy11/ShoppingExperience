import { type Page, expect } from '@playwright/test';
import MailosaurClient from 'mailosaur';
import type { Message, SearchCriteria, MessageSummary, Attachment } from 'mailosaur';

export interface EmailTestData {
  emailAddress: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
}

export interface AttachmentData {
  fileName: string;
  contentType: string;
  content: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: AttachmentData[];
}

export interface ForwardEmailOptions {
  to: string;
  text?: string;
  html?: string;
  subject?: string;
}

export interface ReplyEmailOptions {
  text?: string;
  html?: string;
  subject?: string;
  attachments?: AttachmentData[];
}

export class EmailTestingPage {
  readonly page: Page;
  private mailosaurClient: MailosaurClient | null = null;
  private serverId: string | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private getClient(): MailosaurClient {
    if (!this.mailosaurClient) {
      const apiKey = process.env.MAILOSAUR_API_KEY;
      if (!apiKey) {
        throw new Error('Missing MAILOSAUR_API_KEY environment variable');
      }
      this.mailosaurClient = new MailosaurClient(apiKey);
    }
    return this.mailosaurClient;
  }

  private getServerId(): string {
    if (!this.serverId) {
      const serverId = process.env.MAILOSAUR_SERVER_ID;
      if (!serverId) {
        throw new Error('Missing MAILOSAUR_SERVER_ID environment variable');
      }
      this.serverId = serverId;
    }
    return this.serverId;
  }

  async generateEmailAddress(): Promise<string> {
    const client = this.getClient();
    const serverId = this.getServerId();
    const address = client.servers.generateEmailAddress(serverId);
    return address.replace('@=', '@');
  }

  async waitForEmail(
    sentTo: string,
    criteria?: Partial<SearchCriteria>,
    timeout = 30_000,
    pollInterval = 2_000,
  ): Promise<Message> {
    const client = this.getClient();
    const serverId = this.getServerId();
    const deadline = Date.now() + timeout;

    const searchCriteria: SearchCriteria = {
      sentTo,
      ...criteria,
    };

    while (Date.now() < deadline) {
      try {
        const message = await client.messages.get(serverId, searchCriteria);
        if (message) return message;
      } catch (error) {
        const statusCode = (error as { httpStatusCode?: number }).httpStatusCode;
        const errorType = (error as { errorType?: string }).errorType;

        if (errorType !== 'notfound' && statusCode !== 404) {
          throw new Error(
            `Mailosaur request failed (${errorType ?? 'unknown'}, HTTP ${statusCode ?? 'n/a'}): ${
              (error as Error).message
            }`,
          );
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Email to ${sentTo} not received within ${timeout}ms`);
  }

  async getEmailById(messageId: string): Promise<Message> {
    const client = this.getClient();
    return client.messages.getById(messageId);
  }

  async listEmails(): Promise<Message[]> {
    const client = this.getClient();
    const serverId = this.getServerId();
    const result = await client.messages.list(serverId);
    return (result.items ?? []) as unknown as Message[];
  }

  async searchEmails(criteria: SearchCriteria, page = 0, itemsPerPage = 10): Promise<Message[]> {
    const client = this.getClient();
    const serverId = this.getServerId();
    const result = await client.messages.search(serverId, criteria, { page, itemsPerPage });
    return (result.items ?? []) as unknown as Message[];
  }

  async sendEmail(options: SendEmailOptions): Promise<Message> {
    const client = this.getClient();
    const serverId = this.getServerId();
    return client.messages.create(serverId, {
      to: options.to,
      send: true,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        fileName: a.fileName,
        contentType: a.contentType,
        content: a.content,
      })) as Attachment[],
    });
  }

  async replyToEmail(messageId: string, options: ReplyEmailOptions): Promise<void> {
    const client = this.getClient();
    await client.messages.reply(messageId, {
      text: options.text,
      html: options.html,
    });
  }

  async forwardEmail(messageId: string, options: ForwardEmailOptions): Promise<void> {
    const client = this.getClient();
    await client.messages.forward(messageId, {
      to: options.to,
      text: options.text,
      html: options.html,
    });
  }

  async deleteEmail(messageId: string): Promise<void> {
    const client = this.getClient();
    await client.messages.del(messageId);
  }

  async deleteAllEmails(): Promise<void> {
    const client = this.getClient();
    const serverId = this.getServerId();
    await client.messages.deleteAll(serverId);
  }

  async downloadAttachment(attachmentId: string): Promise<Buffer> {
    const client = this.getClient();
    return client.files.getAttachment(attachmentId);
  }

  async verifyEmailProperties(
    message: Message,
    expected: {
      fromName?: string;
      fromEmail?: string;
      toName?: string;
      toEmail?: string;
      subject?: string;
      ccName?: string;
      ccEmail?: string;
      bccName?: string;
      bccEmail?: string;
    },
  ): Promise<void> {
    if (expected.fromName) {
      expect(message.from?.[0]?.name).toContain(expected.fromName);
    }
    if (expected.fromEmail) {
      expect(message.from?.[0]?.email).toContain(expected.fromEmail);
    }
    if (expected.toName) {
      expect(message.to?.[0]?.name).toContain(expected.toName);
    }
    if (expected.toEmail) {
      expect(message.to?.[0]?.email).toContain(expected.toEmail);
    }
    if (expected.subject) {
      expect(message.subject).toContain(expected.subject);
    }
    if (expected.ccName) {
      expect(message.cc?.[0]?.name).toContain(expected.ccName);
    }
    if (expected.ccEmail) {
      expect(message.cc?.[0]?.email).toContain(expected.ccEmail);
    }
    if (expected.bccName) {
      expect(message.bcc?.[0]?.name).toContain(expected.bccName);
    }
    if (expected.bccEmail) {
      expect(message.bcc?.[0]?.email).toContain(expected.bccEmail);
    }
  }

  async verifyHtmlContent(message: Message, expectedContent: string | RegExp): Promise<void> {
    const htmlBody = message.html?.body ?? '';
    if (typeof expectedContent === 'string') {
      expect(htmlBody).toContain(expectedContent);
    } else {
      expect(htmlBody).toMatch(expectedContent);
    }
  }

  async verifyTextContent(message: Message, expectedContent: string | RegExp): Promise<void> {
    const textBody = message.text?.body ?? '';
    if (typeof expectedContent === 'string') {
      expect(textBody).toContain(expectedContent);
    } else {
      expect(textBody).toMatch(expectedContent);
    }
  }

  async verifyLinks(
    message: Message,
    expectedLinks: Array<{ text?: string; href: string }>,
  ): Promise<void> {
    const htmlLinks = message.html?.links ?? [];
    const textLinks = message.text?.links ?? [];
    const allLinks = [...htmlLinks, ...textLinks];

    for (const expectedLink of expectedLinks) {
      const matchingLink = allLinks.find(
        (link) =>
          link.href === expectedLink.href &&
          (!expectedLink.text || link.text === expectedLink.text),
      );
      expect(matchingLink).toBeDefined();
      if (matchingLink && expectedLink.text) {
        expect(matchingLink.text).toBe(expectedLink.text);
      }
    }
  }

  async clickLinkAndVerify(href: string, expectedStatus = 200): Promise<number> {
    const response = await this.page.request.get(href);
    expect(response.status()).toBe(expectedStatus);
    return response.status();
  }

  async verifyCodes(message: Message, expectedCode?: string | RegExp): Promise<string[]> {
    const htmlCodes = message.html?.codes ?? [];
    const textCodes = message.text?.codes ?? [];
    const allCodes = [...htmlCodes, ...textCodes].map((c) => c.value ?? '').filter(Boolean);

    if (expectedCode) {
      if (typeof expectedCode === 'string') {
        expect(allCodes).toContain(expectedCode);
      } else {
        const matched = allCodes.some((code) => expectedCode.test(code));
        expect(matched).toBe(true);
      }
    }

    return allCodes;
  }

  async verifyAttachments(
    message: Message,
    expectedAttachments: Array<{
      fileName?: string;
      contentType?: string;
      minLength?: number;
    }>,
  ): Promise<void> {
    const attachments = message.attachments ?? [];
    expect(attachments.length).toBeGreaterThanOrEqual(expectedAttachments.length);

    for (const expected of expectedAttachments) {
      const attachment = attachments.find(
        (a) =>
          (!expected.fileName || a.fileName === expected.fileName) &&
          (!expected.contentType || a.contentType === expected.contentType),
      );
      expect(attachment).toBeDefined();
      if (attachment && expected.minLength) {
        expect(attachment.length).toBeGreaterThanOrEqual(expected.minLength);
      }
    }
  }

  async verifyImages(
    message: Message,
    expectedImages: Array<{ src?: string; alt?: string }>,
  ): Promise<void> {
    const images = message.html?.images ?? [];
    expect(images.length).toBeGreaterThanOrEqual(expectedImages.length);

    for (const expected of expectedImages) {
      const image = images.find(
        (img) =>
          (!expected.src || img.src === expected.src) &&
          (!expected.alt || img.alt === expected.alt),
      );
      expect(image).toBeDefined();
    }
  }

  async clickImageAndVerify(src: string, expectedStatus = 200): Promise<number> {
    const response = await this.page.request.get(src);
    expect(response.status()).toBe(expectedStatus);
    return response.status();
  }

  async saveAttachmentToDisk(attachmentId: string, fileName: string): Promise<void> {
    const file = await this.downloadAttachment(attachmentId);
    const fs = await import('node:fs');
    fs.writeFileSync(fileName, file);
  }

  async getAttachmentAsBase64(attachmentId: string): Promise<string> {
    const file = await this.downloadAttachment(attachmentId);
    return file.toString('base64');
  }

  async waitForEmailWithTimeRange(
    sentTo: string,
    receivedAfter: Date,
    timeout = 30_000,
    pollInterval = 2_000,
  ): Promise<Message> {
    return this.waitForEmail(sentTo, { receivedAfter: receivedAfter.toISOString() } as Partial<SearchCriteria>, timeout, pollInterval);
  }

  async searchMultipleEmails(sentTo: string, maxResults = 10): Promise<Message[]> {
    return this.searchEmails({ sentTo }, 0, maxResults);
  }

  async getFullMessages(messageIds: string[]): Promise<Message[]> {
    const client = this.getClient();
    const messages: Message[] = [];
    for (const id of messageIds) {
      messages.push(await client.messages.getById(id));
    }
    return messages;
  }
}
