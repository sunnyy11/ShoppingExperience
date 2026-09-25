import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { env } from '@config/env';

export class ApiClient {
  readonly request: APIRequestContext;
  readonly baseURL: string;

  constructor(request: APIRequestContext) {
    this.request = request;
    this.baseURL = env.baseURL;
  }

  async createAccount(userData: {
    name: string;
    email: string;
    password: string;
    title: string;
    birth_date: string;
    birth_month: string;
    birth_year: string;
    firstname: string;
    lastname: string;
    company: string;
    address1: string;
    address2: string;
    country: string;
    zipcode: string;
    state: string;
    city: string;
    mobile_number: string;
  }): Promise<{ responseCode: number; message: string }> {
    const response = await this.request.post(`${this.baseURL}/api/createAccount`, {
      form: userData,
    });

    if (!response.ok()) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        `Account creation failed: ${response.status()} ${response.statusText()} - ${JSON.stringify(body)}`,
      );
    }

    return await response.json();
  }

  async deleteAccount(email: string, password: string): Promise<void> {
    const response = await this.request.delete(`${this.baseURL}/api/deleteAccount`, {
      form: { email, password },
    });

    if (!response.ok()) {
      throw new Error(`Account deletion failed: ${response.status()} ${response.statusText()}`);
    }
  }

  async clearCart(cookies: string[]): Promise<void> {
    const response = await this.request.post(`${this.baseURL}/api/cart/clear`, {
      headers: { cookie: cookies.join('; ') },
    });

    if (!response.ok()) {
      throw new Error(`Cart clear failed: ${response.status()} ${response.statusText()}`);
    }
  }

  async fetch(options: Parameters<APIRequestContext['fetch']>[0]): Promise<APIResponse> {
    return this.request.fetch(options);
  }
}

export async function createApiClient(request: APIRequestContext): Promise<ApiClient> {
  return new ApiClient(request);
}
