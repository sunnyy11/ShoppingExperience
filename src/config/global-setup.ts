import { logger } from '../utils/logger';

export default async function globalSetup(): Promise<void> {
  logger.info('test run started', {
    baseUrl: process.env.BASE_URL ?? 'https://automationexercise.com',
    ci: Boolean(process.env.CI),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  });
}
