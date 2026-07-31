import { NextResponse } from 'next/server';

import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import {
  DEFAULT_INVITATION_THEME,
  isInvitationThemeKey,
} from '@/lib/invitationThemes';
import {
  getInvitationPageSlugValidationErrorMessage,
  normalizeInvitationPageSlugBase,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import { normalizeInvitationProductTier } from '@/lib/invitationProducts';
import {
  GENERIC_SERVER_ERROR_MESSAGE,
  toSafeHttpErrorResponse,
} from '@/server/apiErrorResponse';
import {
  CustomerApiAuthError,
  verifyCustomerRequest,
} from '@/server/customerApiAuth';
import {
  canCreateCustomerOwnedInvitation,
  CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE,
} from '@/server/customerAuthVerification';
import { createCustomerInvitationPageFromWalletCredit } from '@/server/customerWalletServerService';
import { listCustomerOwnedEventSummaries } from '@/server/customerEventsService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const CUSTOMER_EVENT_CREATE_RATE_LIMIT = {
  limit: 3,
  windowMs: 10 * 60 * 1000,
} as const;

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request: Request) {
  try {
    const customer = await verifyCustomerRequest(request);
    const events = await listCustomerOwnedEventSummaries(customer.uid);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/customer/events] failed to list owned events', error);
    return NextResponse.json(
      { error: '내 청첩장 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const customer = await verifyCustomerRequest(request);

    if (!canCreateCustomerOwnedInvitation(customer)) {
      return NextResponse.json(
        { error: CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          seedSlug?: unknown;
          slugBase?: unknown;
          groomName?: unknown;
          brideName?: unknown;
          groomEnglishName?: unknown;
          brideEnglishName?: unknown;
          productTier?: unknown;
          defaultTheme?: unknown;
        }
      | null;
    const groomName = readTrimmedString(body?.groomName);
    const brideName = readTrimmedString(body?.brideName);
    const groomEnglishName = readTrimmedString(body?.groomEnglishName);
    const brideEnglishName = readTrimmedString(body?.brideEnglishName);
    const generatedSlugBase = normalizeInvitationPageSlugBase(
      [groomEnglishName, brideEnglishName].filter(Boolean).join('-')
    );
    const slugBase = readTrimmedString(body?.slugBase) || generatedSlugBase;
    const seedSlug =
      readTrimmedString(body?.seedSlug) || (getAllWeddingPageSeeds()[0]?.slug ?? '');
    const productTier = normalizeInvitationProductTier(body?.productTier);
    const defaultTheme = isInvitationThemeKey(body?.defaultTheme)
      ? body.defaultTheme
      : DEFAULT_INVITATION_THEME;
    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'customer-event-create',
      keyParts: [customer.uid, slugBase || 'missing-slug'],
      ...CUSTOMER_EVENT_CREATE_RATE_LIMIT,
    });
    const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        {
          status: 429,
          headers: rateLimitHeaders,
        }
      );
    }

    if (!groomName || !brideName) {
      return NextResponse.json(
        { error: '신랑과 신부 한글 이름을 모두 입력해 주세요.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!groomEnglishName || !brideEnglishName) {
      return NextResponse.json(
        { error: '신랑과 신부 영문 이름을 모두 입력해 주세요.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!slugBase) {
      return NextResponse.json(
        { error: '영문 이름으로 만들 수 있는 청첩장 주소가 없습니다. 영문 이름을 다시 확인해 주세요.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const slugValidation = validateInvitationPageSlugBase(slugBase);
    if (!slugValidation.isValid) {
      return NextResponse.json(
        { error: getInvitationPageSlugValidationErrorMessage(slugValidation.reason) },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const created = await createCustomerInvitationPageFromWalletCredit({
      ownerUid: customer.uid,
      ownerEmail: customer.email ?? null,
      ownerDisplayName: customer.name ?? null,
      seedSlug,
      slugBase: slugValidation.normalizedSlugBase,
      groomName,
      brideName,
      productTier,
      defaultTheme,
    });

    return NextResponse.json({
      success: true,
      ...created,
    }, { headers: rateLimitHeaders });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/customer/events] failed to create owned event', error);
    return NextResponse.json(
      { error: GENERIC_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}
