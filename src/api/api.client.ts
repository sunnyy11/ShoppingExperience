import { type APIRequestContext } from '@playwright/test';

export type CreateAccountPayload = {
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
};

export interface CreateAccountResponse {
  responseCode: number;
  message: string;
}

export interface UserDetail {
  id: number;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  title?: string;
  birth_day?: string;
  birth_month?: string;
  birth_year?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  mobile_number?: string;
}

export class ApiClient {
  readonly request: APIRequestContext;
  readonly baseURL: string;

  constructor(request: APIRequestContext) {
    this.request = request;
    this.baseURL = process.env.BASE_URL ?? 'https://automationexercise.com';
  }

  async createAccount(userData: CreateAccountPayload): Promise<CreateAccountResponse> {
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
    const body = (await response.json().catch(() => ({}))) as {
      responseCode?: number;
      message?: string;
    };

    if (!response.ok() || body.responseCode !== 200) {
      throw new Error(
        `Account deletion failed: ${response.status()} ${response.statusText()} - ${JSON.stringify(body)}`,
      );
    }
  }

  async getUserDetailByEmail(email: string): Promise<UserDetail> {
    const response = await this.request.get(
      `${this.baseURL}/api/getUserDetailByEmail?email=${encodeURIComponent(email)}`,
    );
    const body = (await response.json().catch(() => ({}))) as {
      responseCode?: number;
      message?: string;
      user?: UserDetail;
    };

    if (!response.ok() || body.responseCode !== 200 || !body.user) {
      throw new Error(
        `User detail lookup failed: ${response.status()} ${response.statusText()} - ${JSON.stringify(body)}`,
      );
    }

    return body.user;
  }
}

export async function createApiClient(request: APIRequestContext): Promise<ApiClient> {
  return new ApiClient(request);
}
