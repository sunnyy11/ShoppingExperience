import MailosaurClient from 'mailosaur';
import type { Message, SearchCriteria } from 'mailosaur';
import { logger as rootLogger, type AppLogger } from '@utils/logger';

const log: AppLogger = rootLogger.child({ component: 'mailosaur' });

/**
 * Error types that only mean "the message is not there yet". Mailosaur
 * answers a search that finds nothing with `search_timeout` (the search
 * window expired) or `no_messages_found` (the search completed with an empty
 * result). Both are the normal state while an email is still in flight, so
 * they are retried until the deadline of the wait.
 */
const RETRYABLE_ERROR_TYPES: ReadonlySet<string> = new Set([
  'search_timeout',
  'no_messages_found',
  'notfound',
]);

export function isRetryableMailosaurError(error: unknown): boolean {
  const statusCode = (error as { httpStatusCode?: number }).httpStatusCode;
  const errorType = (error as { errorType?: string }).errorType;

  if (statusCode === 404) {
    return true;
  }

  return typeof errorType === 'string' && RETRYABLE_ERROR_TYPES.has(errorType);
}

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
  const address = client.servers.generateEmailAddress(serverId);

  // Mailosaur returns "local@=serverid.mailosaur.net" for this server; the
  // stray "=" makes the target site's client-side validation reject the address.
  const normalized = address.replace('@=', '@');
  log.debug('generated mailbox address', { address: normalized });

  return normalized;
}

export interface WaitForMessageOptions {
  sentTo: string;
  criteria?: Partial<SearchCriteria>;
  timeout?: number;
  pollInterval?: number;
  searchTimeout?: number;
}

export async function waitForMessage({
  sentTo,
  criteria,
  timeout = 60_000,
  pollInterval = 2_000,
  searchTimeout = 5_000,
}: WaitForMessageOptions): Promise<Message> {
  const client = getMailosaurClient();
  const serverId = getServerId();
  const deadline = Date.now() + timeout;
  const searchCriteria: SearchCriteria = { sentTo, ...criteria };

  while (Date.now() < deadline) {
    try {
      const message = await client.messages.get(serverId, searchCriteria, {
        timeout: searchTimeout,
      });
      if (message) {
        log.info('received message', { sentTo, subject: message.subject });
        return message;
      }
    } catch (error) {
      if (!isRetryableMailosaurError(error)) {
        const statusCode = (error as { httpStatusCode?: number }).httpStatusCode;
        const errorType = (error as { errorType?: string }).errorType;

        log.error('mailbox lookup failed', error, { sentTo, errorType, statusCode });
        throw new Error(
          `Mailosaur request failed (${errorType ?? 'unknown'}, HTTP ${statusCode ?? 'n/a'}): ${
            (error as Error).message
          }`,
        );
      }

      log.debug('mailbox is still empty', { sentTo });
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  log.error('message not received before timeout', undefined, { sentTo, timeout });
  throw new Error(`Email to ${sentTo} not received within ${timeout}ms`);
}

export async function waitForEmail(
  sentTo: string,
  timeout = 60_000,
  pollInterval = 2_000,
): Promise<Message> {
  return waitForMessage({ sentTo, timeout, pollInterval });
}

export async function purgeMessages(): Promise<void> {
  const client = getMailosaurClient();
  const serverId = getServerId();
  await client.messages.deleteAll(serverId);
  log.info('purged the test mailbox', { serverId });
}
