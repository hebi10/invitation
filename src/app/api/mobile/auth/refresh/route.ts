import { NextResponse } from 'next/server';

import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CUSTOMER_AUTH_REFRESH_RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
} as const;

type FirebaseRefreshResponse = {
  id_token?: string;
  refresh_token?: string;
  expires_in?: string;
  user_id?: string;
};

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFirebaseWebApiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? '';
}

function buildMobileCustomerAuthSession(payload: FirebaseRefreshResponse) {
  const idToken = readTrimmedString(payload.id_token);
  const refreshToken = readTrimmedString(payload.refresh_token);
  const uid = readTrimmedString(payload.user_id);
  const expiresInSeconds = Number(readTrimmedString(payload.expires_in));

  if (!idToken || !refreshToken || !uid || !Number.isFinite(expiresInSeconds)) {
    throw new Error('Invalid customer credentials.');
  }

  return {
    idToken,
    refreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    uid,
    email: '',
    displayName: null,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        refreshToken?: unknown;
      }
    | null;
  const refreshToken = readTrimmedString(body?.refreshToken);

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-customer-auth-refresh',
    keyParts: [refreshToken ? 'present' : 'missing'],
    ...MOBILE_CUSTOMER_AUTH_REFRESH_RATE_LIMIT,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Customer refresh token is required.' },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Firebase Auth API key is not configured.' },
      { status: 500, headers: rateLimitHeaders }
    );
  }

  const formBody = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
      cache: 'no-store',
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | FirebaseRefreshResponse
    | null;

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Invalid customer credentials.' },
      { status: response.status === 400 ? 401 : response.status, headers: rateLimitHeaders }
    );
  }

  try {
    return NextResponse.json(
      {
        authenticated: true,
        session: buildMobileCustomerAuthSession(payload as FirebaseRefreshResponse),
      },
      { headers: rateLimitHeaders }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid customer credentials.' },
      { status: 401, headers: rateLimitHeaders }
    );
  }
}
