import { logger } from '../utils/logger';

export default async function globalTeardown(): Promise<void> {
  logger.info('test run finished');

  try {
    const { globalTeardown: cleanupAuthState } = await import('../fixtures/index');
    await cleanupAuthState();
  } catch (error) {
    logger.warn('auth state cleanup skipped', { error });
  }
}
