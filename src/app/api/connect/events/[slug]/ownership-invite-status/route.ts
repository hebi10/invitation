import { NextResponse } from 'next/server';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  EventOwnershipInviteError,
  inspectEventOwnershipInvite,
} from '@/server/eventOwnershipInviteService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const NO_STORE_HEADERS = { 'cache-control': 'no-store' } as const;
const PUBLIC_OWNERSHIP_INVITE_RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
} as const;

function withNoStore(response: NextResponse) {
  response.headers.set('cache-control', 'no-store');
  return response;
}

function readToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const pageSlug = normalizeInvitationPageSlugInput(slug);
    if (!pageSlug) {
      return NextResponse.json(
        { error: '청첩장 연결 주소가 올바르지 않습니다.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'public-ownership-invite-inspect',
      keyParts: [pageSlug],
      ...PUBLIC_OWNERSHIP_INVITE_RATE_LIMIT,
    });
    const responseHeaders = {
      ...buildRateLimitHeaders(rateLimitResult),
      ...NO_STORE_HEADERS,
    };
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '연결 링크 확인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: responseHeaders }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { token?: unknown }
      | null;
    const token = readToken(body?.token);
    if (!token) {
      return NextResponse.json(
        { error: '청첩장 연결 토큰을 확인해 주세요.' },
        { status: 400, headers: responseHeaders }
      );
    }

    const invite = await inspectEventOwnershipInvite({ pageSlug, token });
    const tokenMatches = invite.status !== 'invalid';

    return NextResponse.json(
      {
        success: true,
        status: invite.status,
        slug: tokenMatches ? invite.slug : pageSlug,
        displayName: tokenMatches ? invite.displayName : null,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    if (error instanceof EventOwnershipInviteError) {
      return withNoStore(toSafeHttpErrorResponse(error));
    }

    console.error('[api/connect/events/ownership-invite-status] failed to inspect invite', error);
    return NextResponse.json(
      { error: '청첩장 연결 링크를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
