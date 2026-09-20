import { faker } from '@faker-js/faker';

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

export function getConfiguredUser(): TestUser {
  const email = process.env.AUTOMATION_EXERCISE_TEST_EMAIL;
  const password = process.env.AUTOMATION_EXERCISE_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'AUTOMATION_EXERCISE_TEST_EMAIL and AUTOMATION_EXERCISE_TEST_PASSWORD must be set in .env.',
    );
  }

  return { email, password, firstName: 'Test', lastName: 'User' };
}
