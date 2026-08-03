import { NextResponse } from 'next/server';

import {
  assertSameOriginDemoMutation,
  DemoExperienceRequestError,
  requireDemoExperienceSession,
  toDemoExperienceErrorResponse,
} from '@/server/demoExperienceRequest';
import {
  beginDemoDailyWorkspace,
  DemoExperienceDomainError,
  listDemoExperienceEvents,
} from '@/server/demoExperienceService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MUTATION_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 } as const;

function toRouteError(error: unknown) {
  if (error instanceof DemoExperienceRequestError) {
    return toDemoExperienceErrorResponse(error);
  }
  if (error instanceof DemoExperienceDomainError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }
  console.error('[api/experience/events] failed', error);
  return NextResponse.json(
    { error: '체험 청첩장 정보를 처리하지 못했습니다.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const session = requireDemoExperienceSession(request);
    const result = await listDemoExperienceEvents(session.role);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginDemoMutation(request);
    const session = requireDemoExperienceSession(request, ['admin']);
    const rateLimit = await applyScopedRateLimit({
      request,
      scope: 'demo-experience-mutation',
      keyParts: [session.sessionId, 'create'],
      limit: MUTATION_RATE_LIMIT.limit,
      windowMs: MUTATION_RATE_LIMIT.windowMs,
    });
    const headers = buildRateLimitHeaders(rateLimit);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '체험 청첩장 생성 요청이 너무 많습니다.' },
        { status: 429, headers }
      );
    }

    const body = (await request.json().catch(() => null)) as { seedSlug?: unknown } | null;
    const seedSlug = typeof body?.seedSlug === 'string' ? body.seedSlug.trim() : '';
    if (!seedSlug) {
      return NextResponse.json(
        { error: '체험에 사용할 청첩장 템플릿을 선택해 주세요.' },
        { status: 400, headers }
      );
    }

    const result = await beginDemoDailyWorkspace(seedSlug);
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    return toRouteError(error);
  }
}
