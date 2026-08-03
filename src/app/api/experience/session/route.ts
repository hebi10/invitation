import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getKstDateKey } from '@/lib/demoExperienceTime';
import {
  assertSameOriginDemoMutation,
  DemoExperienceRequestError,
  requireDemoExperienceSession,
  toDemoExperienceErrorResponse,
} from '@/server/demoExperienceRequest';
import {
  createDemoExperienceSessionValue,
  DEMO_EXPERIENCE_SESSION_COOKIE,
} from '@/server/demoExperienceSession';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';
import type { DemoExperienceRole } from '@/types/demoExperience';

const SESSION_RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 } as const;

function createSessionResponse(
  session: { sessionId: string; role: DemoExperienceRole; dateKey: string },
  headers?: HeadersInit
) {
  const issued = createDemoExperienceSessionValue(session);
  const response = NextResponse.json(
    { authenticated: true, session: { ...session, expiresAt: issued.expiresAt } },
    { headers }
  );
  response.cookies.set(DEMO_EXPERIENCE_SESSION_COOKIE, issued.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(issued.expiresAt * 1000),
  });
  return response;
}

export async function GET(request: Request) {
  try {
    const session = requireDemoExperienceSession(request);
    return NextResponse.json({ authenticated: true, session });
  } catch (error) {
    return error instanceof DemoExperienceRequestError
      ? toDemoExperienceErrorResponse(error)
      : NextResponse.json({ error: '체험 세션을 확인하지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginDemoMutation(request);
    const rateLimit = await applyScopedRateLimit({
      request,
      scope: 'demo-experience-session',
      limit: SESSION_RATE_LIMIT.limit,
      windowMs: SESSION_RATE_LIMIT.windowMs,
    });
    const headers = buildRateLimitHeaders(rateLimit);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '체험 시작 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers }
      );
    }

    return createSessionResponse(
      { sessionId: randomUUID(), role: 'admin', dateKey: getKstDateKey() },
      headers
    );
  } catch (error) {
    return error instanceof DemoExperienceRequestError
      ? toDemoExperienceErrorResponse(error)
      : NextResponse.json({ error: '체험을 시작하지 못했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOriginDemoMutation(request);
    const session = requireDemoExperienceSession(request);
    const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
    if (body?.role !== 'admin' && body?.role !== 'customer') {
      return NextResponse.json({ error: '체험 역할이 올바르지 않습니다.' }, { status: 400 });
    }

    return createSessionResponse({
      sessionId: session.sessionId,
      role: body.role,
      dateKey: session.dateKey,
    });
  } catch (error) {
    return error instanceof DemoExperienceRequestError
      ? toDemoExperienceErrorResponse(error)
      : NextResponse.json({ error: '체험 역할을 변경하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOriginDemoMutation(request);
    const response = NextResponse.json({ authenticated: false });
    response.cookies.set(DEMO_EXPERIENCE_SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return error instanceof DemoExperienceRequestError
      ? toDemoExperienceErrorResponse(error)
      : NextResponse.json({ error: '체험을 종료하지 못했습니다.' }, { status: 500 });
  }
}

