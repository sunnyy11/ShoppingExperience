import { request } from '@playwright/test';

export interface GoogleTokens {
  access_token: string;
  id_token: string;
  expires_in: number;
  scope: string;
}

export async function getGoogleTokens(): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_TEST_CLIENT_ID ?? process.env.OAUTH_GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_TEST_CLIENT_SECRET ?? process.env.OAUTH_GOOGLE_CLIENT_SECRET;
  const refreshToken =
    process.env.GOOGLE_TEST_REFRESH_TOKEN ?? process.env.OAUTH_GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google OAuth credentials. Set GOOGLE_TEST_CLIENT_ID (or OAUTH_GOOGLE_CLIENT_ID), ' +
        'GOOGLE_TEST_CLIENT_SECRET (or OAUTH_GOOGLE_CLIENT_SECRET), and ' +
        'GOOGLE_TEST_REFRESH_TOKEN (or OAUTH_GOOGLE_REFRESH_TOKEN) in .env.',
    );
  }

  const ctx = await request.newContext();
  try {
    const res = await ctx.post('https://oauth2.googleapis.com/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      },
    });

    const data = await res.json();

    if (!data.access_token) {
      throw new Error(`Google token exchange failed (${res.status()}): ${JSON.stringify(data)}`);
    }

    return data as GoogleTokens;
  } finally {
    await ctx.dispose();
  }
}
