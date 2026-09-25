import MailosaurClient from 'mailosaur';
import type { Message } from 'mailosaur';

let client: MailosaurClient | null = null;

export function getMailosaurClient(): MailosaurClient {
  if (client) return client;

  const apiKey = process.env.MAILOSAUR_API_KEY;
  if (!apiKey) {
    throw new Error('Missing MAILOSAUR_API_KEY environment variable');
  }

  client = new MailosaurClient(apiKey);
  return client;
}

export function getServerId(): string {
  const serverId = process.env.MAILOSAUR_SERVER_ID;
  if (!serverId) {
    throw new Error('Missing MAILOSAUR_SERVER_ID environment variable');
  }
  return serverId;
}

export function generateEmailAddress(): string {
  const client = getMailosaurClient();
  const serverId = getServerId();
  return client.servers.generateEmailAddress(serverId);
}

export async function waitForEmail(
  sentTo: string,
  timeout = 30_000,
  pollInterval = 2_000,
): Promise<Message> {
  const client = getMailosaurClient();
  const serverId = getServerId();
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const message = await client.messages.get(serverId, { sentTo });
      if (message) return message;
    } catch (error) {
      const statusCode = (error as { httpStatusCode?: number }).httpStatusCode;
      const errorType = (error as { errorType?: string }).errorType;

      // Only an empty inbox is retryable; credentials or server problems are not.
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

export async function purgeMessages(): Promise<void> {
  const client = getMailosaurClient();
  const serverId = getServerId();
  await client.messages.deleteAll(serverId);
}
