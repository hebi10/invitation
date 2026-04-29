import { NextResponse } from 'next/server';

import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CUSTOMER_AUTH_RATE_LIMIT = {
  limit: 8,
  windowMs: 10 * 60 * 1000,
} as const;

type FirebasePasswordLoginResponse = {
  idToken?: string;
  email?: string;
  refreshToken?: string;
  expiresIn?: string;
  localId?: string;
  displayName?: string;
};

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFirebaseWebApiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? '';
}

function buildMobileCustomerAuthSession(payload: FirebasePasswordLoginResponse) {
  const idToken = readTrimmedString(payload.idToken);
  const refreshToken = readTrimmedString(payload.refreshToken);
  const uid = readTrimmedString(payload.localId);
  const email = readTrimmedString(payload.email);
  const expiresInSeconds = Number(readTrimmedString(payload.expiresIn));

  if (!idToken || !refreshToken || !uid || !email || !Number.isFinite(expiresInSeconds)) {
    throw new Error('Invalid customer credentials.');
  }

  return {
    idToken,
    refreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    uid,
    email,
    displayName: readTrimmedString(payload.displayName) || null,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: unknown;
        password?: unknown;
      }
    | null;
  const email = readTrimmedString(body?.email);
  const password = readTrimmedString(body?.password);

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-customer-auth-login',
    keyParts: [email.toLowerCase() || 'missing-email'],
    ...MOBILE_CUSTOMER_AUTH_RATE_LIMIT,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Customer email and password are required.' },
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

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
      cache: 'no-store',
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | FirebasePasswordLoginResponse
    | { error?: { message?: string } }
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
        session: buildMobileCustomerAuthSession(payload as FirebasePasswordLoginResponse),
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
