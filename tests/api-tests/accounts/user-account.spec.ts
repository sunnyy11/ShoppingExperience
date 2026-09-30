import { expect, test } from '@fixtures';
import { createApiClient, type ApiClient, type CreateAccountPayload } from '@api/api.client';
import { faker } from '@faker-js/faker';

function buildCreateAccountPayload(): CreateAccountPayload {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    password: `Pw!${faker.string.alphanumeric(14)}`,
    title: faker.helpers.arrayElement(['Mr', 'Mrs', 'Miss']),
    birth_date: faker.helpers.arrayElement(['1', '10', '20']),
    birth_month: faker.helpers.arrayElement(['1', '6', '12']),
    birth_year: faker.helpers.arrayElement(['1985', '1990', '1995']),
    firstname: firstName,
    lastname: lastName,
    company: faker.company.name(),
    address1: faker.location.streetAddress(),
    address2: faker.location.secondaryAddress(),
    country: 'United States',
    zipcode: '10001',
    state: 'New York',
    city: 'New York',
    mobile_number: faker.phone.number(),
  };
}

test.describe('Automation Exercise API — user account lifecycle', () => {
  let api: ApiClient;

  test.beforeEach(async ({ request }) => {
    api = await createApiClient(request);
  });

  test('API 11: creates a new user account', async () => {
    const payload = buildCreateAccountPayload();

    const result = await api.createAccount(payload);

    expect(result.responseCode).toBe(201);
    expect(result.message).toBe('User created!');

    await api.deleteAccount(payload.email, payload.password);
  });

  test('API 14: returns user account detail by email', async () => {
    const payload = buildCreateAccountPayload();
    await api.createAccount(payload);

    const user = await api.getUserDetailByEmail(payload.email);

    expect(user.email).toBe(payload.email);
    expect(user.name).toBe(payload.name);
    expect(user.first_name).toBe(payload.firstname);
    expect(user.last_name).toBe(payload.lastname);
    expect(user.city).toBe(payload.city);
    expect(user.zipcode).toBe(payload.zipcode);

    await api.deleteAccount(payload.email, payload.password);
  });

  test('API 12: deletes a user account', async () => {
    const payload = buildCreateAccountPayload();
    await api.createAccount(payload);

    await expect(api.deleteAccount(payload.email, payload.password)).resolves.toBeUndefined();

    await expect(api.getUserDetailByEmail(payload.email)).rejects.toThrow(
      /User detail lookup failed/,
    );
  });

  test('API 12: throws when deleting with an incorrect password', async () => {
    const payload = buildCreateAccountPayload();
    await api.createAccount(payload);

    await expect(api.deleteAccount(payload.email, 'WrongPassword@123')).rejects.toThrow(
      /Account deletion failed/,
    );

    await api.deleteAccount(payload.email, payload.password);
  });

  test('API 14: throws when looking up an unknown email', async () => {
    await expect(api.getUserDetailByEmail(faker.internet.email())).rejects.toThrow(
      /User detail lookup failed/,
    );
  });
});
