import MailosaurClient from 'mailosaur';

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
  pollInterval = 2_000
) {
  const client = getMailosaurClient();
  const serverId = getServerId();
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const message = await client.messages.get(serverId, { sentTo });
      if (message) return message;
    } catch {
      // Message not found yet, continue polling
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Email to ${sentTo} not received within ${timeout}ms`);
}