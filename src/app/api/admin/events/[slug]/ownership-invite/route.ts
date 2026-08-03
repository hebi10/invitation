import { NextResponse } from 'next/server';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  EventOwnershipInviteError,
  issueEventOwnershipInvite,
} from '@/server/eventOwnershipInviteService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const NO_STORE_HEADERS = { 'cache-control': 'no-store' } as const;
const ADMIN_OWNERSHIP_INVITE_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
} as const;

function withNoStore(response: NextResponse) {
  response.headers.set('cache-control', 'no-store');
  return response;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const admin = await verifyAdminRequest(request);
    const { slug } = await context.params;
    const pageSlug = normalizeInvitationPageSlugInput(slug);
    await request.json().catch(() => ({}));

    if (!pageSlug) {
      return NextResponse.json(
        { error: '연결 링크를 만들 청첩장 주소가 올바르지 않습니다.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'admin-ownership-invite-issue',
      keyParts: [admin.uid, pageSlug],
      ...ADMIN_OWNERSHIP_INVITE_RATE_LIMIT,
    });
    const responseHeaders = {
      ...buildRateLimitHeaders(rateLimitResult),
      ...NO_STORE_HEADERS,
    };

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '연결 링크 발급 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: responseHeaders }
      );
    }

    const invite = await issueEventOwnershipInvite({
      pageSlug,
      createdByUid: admin.uid,
      baseUrl: new URL(request.url).origin,
    });

    return NextResponse.json(
      {
        success: true,
        slug: invite.slug,
        url: invite.url,
        expiresAt: invite.expiresAt.toISOString(),
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    if (
      error instanceof AdminApiAuthError ||
      error instanceof EventOwnershipInviteError
    ) {
      return withNoStore(toSafeHttpErrorResponse(error));
    }

    console.error('[api/admin/events/ownership-invite] failed to issue invite', error);
    return NextResponse.json(
      { error: '청첩장 연결 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
