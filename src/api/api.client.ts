import { type APIRequestContext } from '@playwright/test';
import { logger as rootLogger, type AppLogger } from '@utils/logger';

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
  private readonly log: AppLogger;

  constructor(request: APIRequestContext) {
    this.request = request;
    this.baseURL = process.env.BASE_URL ?? 'https://automationexercise.com';
    this.log = rootLogger.child({ component: 'api-client' });
  }

  async createAccount(userData: CreateAccountPayload): Promise<CreateAccountResponse> {
    const startedAt = Date.now();
    this.log.info('POST /api/createAccount', { payload: userData });

    const response = await this.request.post(`${this.baseURL}/api/createAccount`, {
      form: userData,
    });

    this.log.info('POST /api/createAccount completed', {
      status: response.status(),
      durationMs: Date.now() - startedAt,
    });

    if (!response.ok()) {
      const body = await response.json().catch(() => ({}));
      this.log.error('POST /api/createAccount failed', undefined, {
        status: response.status(),
        body,
      });
      throw new Error(
        `Account creation failed: ${response.status()} ${response.statusText()} - ${JSON.stringify(body)}`,
      );
    }

    return await response.json();
  }

  async deleteAccount(email: string, password: string): Promise<void> {
    const startedAt = Date.now();
    this.log.info('DELETE /api/deleteAccount', { email });

    const response = await this.request.delete(`${this.baseURL}/api/deleteAccount`, {
      form: { email, password },
    });
    const body = (await response.json().catch(() => ({}))) as {
      responseCode?: number;
      message?: string;
    };

    this.log.info('DELETE /api/deleteAccount completed', {
      status: response.status(),
      responseCode: body.responseCode,
      durationMs: Date.now() - startedAt,
    });

    if (!response.ok() || body.responseCode !== 200) {
      throw new Error(
        `Account deletion failed: ${response.status()} ${response.statusText()} - ${JSON.stringify(body)}`,
      );
    }
  }

  async getUserDetailByEmail(email: string): Promise<UserDetail> {
    const startedAt = Date.now();
    this.log.info('GET /api/getUserDetailByEmail', { email });

    const response = await this.request.get(
      `${this.baseURL}/api/getUserDetailByEmail?email=${encodeURIComponent(email)}`,
    );
    const body = (await response.json().catch(() => ({}))) as {
      responseCode?: number;
      message?: string;
      user?: UserDetail;
    };

    this.log.info('GET /api/getUserDetailByEmail completed', {
      status: response.status(),
      responseCode: body.responseCode,
      durationMs: Date.now() - startedAt,
    });

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
