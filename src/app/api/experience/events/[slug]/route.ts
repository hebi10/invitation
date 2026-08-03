import { NextResponse } from 'next/server';

import { INVITATION_VARIANT_KEYS } from '@/lib/invitationVariants';
import {
  assertSameOriginDemoMutation,
  DemoExperienceRequestError,
  requireDemoExperienceSession,
  toDemoExperienceErrorResponse,
} from '@/server/demoExperienceRequest';
import {
  deleteDemoDailyWorkspace,
  DemoExperienceDomainError,
  DemoExperienceVersionConflictError,
  getDemoEditableEvent,
  saveDemoDailyWorkspace,
} from '@/server/demoExperienceService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

const MUTATION_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 } as const;

function toRouteError(error: unknown) {
  if (error instanceof DemoExperienceRequestError) {
    return toDemoExperienceErrorResponse(error);
  }
  if (error instanceof DemoExperienceVersionConflictError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'VERSION_CONFLICT',
        currentVersion: error.currentVersion,
      },
      { status: 409 }
    );
  }
  if (error instanceof DemoExperienceDomainError) {
    const code =
      error.code === 'DEMO_SEED_READ_ONLY' ? 'DEMO_SEED_READ_ONLY' : error.code;
    return NextResponse.json({ error: error.message, code }, { status: error.status });
  }
  console.error('[api/experience/events/[slug]] failed', error);
  return NextResponse.json(
    { error: '체험 청첩장 정보를 처리하지 못했습니다.' },
    { status: 500 }
  );
}

async function applyMutationRateLimit(request: Request, sessionId: string, slug: string) {
  const rateLimit = await applyScopedRateLimit({
    request,
    scope: 'demo-experience-mutation',
    keyParts: [sessionId, slug],
    limit: MUTATION_RATE_LIMIT.limit,
    windowMs: MUTATION_RATE_LIMIT.windowMs,
  });
  return { rateLimit, headers: buildRateLimitHeaders(rateLimit) };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = requireDemoExperienceSession(request);
    const { slug } = await context.params;
    const result = await getDemoEditableEvent(session.role, slug);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    assertSameOriginDemoMutation(request);
    const session = requireDemoExperienceSession(request);
    const { slug } = await context.params;
    const { rateLimit, headers } = await applyMutationRateLimit(
      request,
      session.sessionId,
      slug
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '체험 청첩장 저장 요청이 너무 많습니다.' },
        { status: 429, headers }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          expectedVersion?: unknown;
          config?: unknown;
          published?: unknown;
          defaultTheme?: unknown;
        }
      | null;
    const expectedVersion = body?.expectedVersion;
    const defaultTheme = body?.defaultTheme;
    if (
      typeof expectedVersion !== 'number' ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 0 ||
      !body?.config ||
      typeof body.config !== 'object' ||
      Array.isArray(body.config) ||
      typeof body.published !== 'boolean' ||
      typeof defaultTheme !== 'string' ||
      !INVITATION_VARIANT_KEYS.includes(defaultTheme as InvitationThemeKey)
    ) {
      return NextResponse.json(
        { error: '체험 청첩장 저장 정보가 올바르지 않습니다.' },
        { status: 400, headers }
      );
    }

    const result = await saveDemoDailyWorkspace({
      slug,
      expectedVersion,
      config: body.config as InvitationPageSeed,
      published: body.published,
      defaultTheme: defaultTheme as InvitationThemeKey,
    });
    return NextResponse.json(
      {
        success: true,
        slug,
        dateKey: result.dateKey,
        version: result.version,
        editableConfig: result.editableConfig,
      },
      { headers }
    );
  } catch (error) {
    return toRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    assertSameOriginDemoMutation(request);
    const session = requireDemoExperienceSession(request, ['admin']);
    const { slug } = await context.params;
    const { rateLimit, headers } = await applyMutationRateLimit(
      request,
      session.sessionId,
      slug
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '체험 청첩장 삭제 요청이 너무 많습니다.' },
        { status: 429, headers }
      );
    }

    const result = await deleteDemoDailyWorkspace(slug);
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    return toRouteError(error);
  }
}
