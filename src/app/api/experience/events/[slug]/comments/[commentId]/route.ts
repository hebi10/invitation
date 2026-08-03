import { NextResponse } from 'next/server';

import {
  assertSameOriginDemoMutation,
  DemoExperienceRequestError,
  requireDemoExperienceSession,
  toDemoExperienceErrorResponse,
} from '@/server/demoExperienceRequest';
import {
  deleteDemoEventComment,
  DemoExperienceDomainError,
} from '@/server/demoExperienceService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MUTATION_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 } as const;

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    assertSameOriginDemoMutation(request);
    const session = requireDemoExperienceSession(request);
    const { slug, commentId } = await context.params;
    const rateLimit = await applyScopedRateLimit({
      request,
      scope: 'demo-experience-mutation',
      keyParts: [session.sessionId, slug, commentId],
      limit: MUTATION_RATE_LIMIT.limit,
      windowMs: MUTATION_RATE_LIMIT.windowMs,
    });
    const headers = buildRateLimitHeaders(rateLimit);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '체험 방명록 삭제 요청이 너무 많습니다.' },
        { status: 429, headers }
      );
    }

    const result = await deleteDemoEventComment(
      session.role,
      slug,
      commentId
    );
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    if (error instanceof DemoExperienceRequestError) {
      return toDemoExperienceErrorResponse(error);
    }
    if (error instanceof DemoExperienceDomainError) {
      const code =
        error.code === 'DEMO_SEED_READ_ONLY' ? 'DEMO_SEED_READ_ONLY' : error.code;
      return NextResponse.json({ error: error.message, code }, { status: error.status });
    }
    console.error('[api/experience/events/[slug]/comments/[commentId]] failed', error);
    return NextResponse.json(
      { error: '체험 방명록을 삭제하지 못했습니다.' },
      { status: 500 }
    );
  }
}
