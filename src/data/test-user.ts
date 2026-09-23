import { faker } from '@faker-js/faker';
import { type ShippingDetails } from '../pages/CheckoutPage';

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface PaymentDetails {
  name: string;
  number: string;
  cvc: string;
  month: string;
  year: string;
}

export interface RegistrationDetails {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  phone: string;
  dob: {
    day: string;
    month: string;
    year: string;
  };
}

export function buildTestUser(): TestUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email({ firstName, lastName }).toLowerCase();
  const password = `Pw!${faker.string.alphanumeric(14)}`;

  return { email, password, firstName, lastName };
}

export function buildRegistrationDetails(user: TestUser): RegistrationDetails {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    company: faker.company.name(),
    address1: faker.location.streetAddress(),
    address2: faker.location.secondaryAddress(),
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    zipcode: '560001',
    phone: faker.phone.number(),
    dob: {
      day: faker.helpers.arrayElement(['1', '10', '15', '20', '25']),
      month: faker.helpers.arrayElement(['1', '5', '8', '12']),
      year: faker.helpers.arrayElement(['1980', '1990', '1995', '2000']),
    },
  };
}

export function buildShippingDetails(user: TestUser): ShippingDetails {
  const reg = buildRegistrationDetails(user);
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    company: reg.company,
    address: reg.address1,
    phone: reg.phone,
  };
}

export function buildPaymentDetails(user: TestUser): PaymentDetails {
  return {
    name: `${user.firstName} ${user.lastName}`,
    number: faker.finance.creditCardNumber(),
    cvc: faker.string.numeric(3),
    month: faker.helpers.arrayElement([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
    ]),
    year: faker.helpers.arrayElement(['2025', '2026', '2027', '2028', '2029', '2030']),
  };
}

function readUserPool(): TestUser[] {
  const pool: TestUser[] = [];

  for (let index = 1; ; index += 1) {
    const emailVariable = `AUTOMATION_EXERCISE_TEST_EMAIL_${index}`;
    const passwordVariable = `AUTOMATION_EXERCISE_TEST_PASSWORD_${index}`;
    const email = process.env[emailVariable]?.trim();
    const password = process.env[passwordVariable]?.trim();

    if (!email && !password) {
      break;
    }

    if (!email || !password) {
      throw new Error(`Both ${emailVariable} and ${passwordVariable} must be set in .env.`);
    }

    pool.push({
      email,
      password,
      firstName: 'Test',
      lastName: `User${index}`,
    });
  }

  if (pool.length === 0) {
    throw new Error(
      'At least one AUTOMATION_EXERCISE_TEST_EMAIL_1 and AUTOMATION_EXERCISE_TEST_PASSWORD_1 pair must be set in .env.',
    );
  }

  return pool;
}

const userPool = readUserPool();

export function getUserForWorker(workerIndex: number): TestUser {
  const user = userPool[workerIndex % userPool.length];

  if (!user) {
    throw new Error(`No test user is available for worker ${workerIndex}.`);
  }

  return user;
}

export function getConfiguredUser(): TestUser {
  const user = userPool[0];

  if (!user) {
    throw new Error('No configured test user is available.');
  }

  return user;
}
