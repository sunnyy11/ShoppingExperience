import { faker } from '@faker-js/faker';
import { readFile, writeFile } from 'node:fs/promises';

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function buildTestUser(): TestUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email({ firstName, lastName }).toLowerCase();
  const password = `Pw!${faker.string.alphanumeric(14)}`;

  return { email, password, firstName, lastName };
}

export async function storeTestUser(user: TestUser): Promise<void> {
  const envPath = '.env';
  const envContent = await readFile(envPath, 'utf8');
  const entries = [
    ['AUTOMATION_EXERCISE_TEST_EMAIL', user.email],
    ['AUTOMATION_EXERCISE_TEST_PASSWORD', user.password],
  ] as const;

  const updatedEnvContent = entries.reduce((content, [key, value]) => {
    const line = `${key}=${value}`;
    const keyPattern = new RegExp(`^${key}=.*$`, 'm');

    return keyPattern.test(content)
      ? content.replace(keyPattern, line)
      : `${content.trimEnd()}\n${line}\n`;
  }, envContent);

  await writeFile(envPath, updatedEnvContent, 'utf8');
  process.env.AUTOMATION_EXERCISE_TEST_EMAIL = user.email;
  process.env.AUTOMATION_EXERCISE_TEST_PASSWORD = user.password;
}

export function getConfiguredUser(): TestUser {
  const email = process.env.AUTOMATION_EXERCISE_TEST_EMAIL;
  const password = process.env.AUTOMATION_EXERCISE_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'AUTOMATION_EXERCISE_TEST_EMAIL and AUTOMATION_EXERCISE_TEST_PASSWORD must be set by registration before login.',
    );
  }

  return { email, password, firstName: 'Test', lastName: 'User' };
}
