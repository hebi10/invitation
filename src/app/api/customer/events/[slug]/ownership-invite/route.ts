import { NextResponse } from 'next/server';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { CustomerApiAuthError, verifyCustomerRequest } from '@/server/customerApiAuth';
import {
  canUseVerifiedCustomerFeatures,
  CUSTOMER_VERIFIED_FEATURE_REQUIRED_MESSAGE,
} from '@/server/customerAuthVerification';
import {
  consumeEventOwnershipInvite,
  EventOwnershipInviteError,
} from '@/server/eventOwnershipInviteService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const NO_STORE_HEADERS = { 'cache-control': 'no-store' } as const;
const CUSTOMER_OWNERSHIP_INVITE_RATE_LIMIT = {
  limit: 5,
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
    const customer = await verifyCustomerRequest(request);
    if (!canUseVerifiedCustomerFeatures(customer)) {
      return NextResponse.json(
        { error: CUSTOMER_VERIFIED_FEATURE_REQUIRED_MESSAGE },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const { slug } = await context.params;
    const pageSlug = normalizeInvitationPageSlugInput(slug);
    if (!pageSlug) {
      return NextResponse.json(
        { error: '연결할 청첩장 주소가 올바르지 않습니다.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'customer-ownership-invite-consume',
      keyParts: [customer.uid, pageSlug],
      ...CUSTOMER_OWNERSHIP_INVITE_RATE_LIMIT,
    });
    const responseHeaders = {
      ...buildRateLimitHeaders(rateLimitResult),
      ...NO_STORE_HEADERS,
    };
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '청첩장 연결 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
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

    const connected = await consumeEventOwnershipInvite({
      pageSlug,
      token,
      customer: {
        uid: customer.uid,
        email: customer.email ?? null,
        displayName: customer.name ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        slug: connected.slug,
        eventId: connected.eventId,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    if (
      error instanceof CustomerApiAuthError ||
      error instanceof EventOwnershipInviteError
    ) {
      return withNoStore(toSafeHttpErrorResponse(error));
    }

    console.error('[api/customer/events/ownership-invite] failed to consume invite', error);
    return NextResponse.json(
      { error: '청첩장을 계정에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
