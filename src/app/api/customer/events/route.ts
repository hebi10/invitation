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
  canCreateCustomerOwnedInvitation,
  CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE,
} from '@/server/customerAuthVerification';
import { createCustomerInvitationPageFromWalletCredit } from '@/server/customerWalletServerService';
import { listCustomerOwnedEventSummaries } from '@/server/customerEventsService';
import { getServerAuth } from '@/server/firebaseAdmin';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const CUSTOMER_EVENT_CREATE_RATE_LIMIT = {
  limit: 3,
  windowMs: 10 * 60 * 1000,
} as const;

async function verifyCustomer(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!idToken) {
    return {
      error: NextResponse.json(
        { error: '로그인 토큰이 없습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      ),
      decodedToken: null,
    };
  }

  const serverAuth = getServerAuth();
  if (!serverAuth) {
    return {
      error: NextResponse.json(
        { error: 'Firebase Admin Auth를 초기화하지 못했습니다.' },
        { status: 500 }
      ),
      decodedToken: null,
    };
  }

  const decodedToken = await serverAuth.verifyIdToken(idToken).catch(() => null);
  if (!decodedToken) {
    return {
      error: NextResponse.json(
        { error: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      ),
      decodedToken: null,
    };
  }

  return {
    error: null,
    decodedToken,
  };
}

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request: Request) {
  try {
    const customer = await verifyCustomer(request);
    if (customer.error || !customer.decodedToken) {
      return customer.error;
    }

    const events = await listCustomerOwnedEventSummaries(customer.decodedToken.uid);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('[api/customer/events] failed to list owned events', error);
    return NextResponse.json(
      { error: '내 청첩장 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const customer = await verifyCustomer(request);
    if (customer.error || !customer.decodedToken) {
      return customer.error;
    }

    if (!canCreateCustomerOwnedInvitation(customer.decodedToken)) {
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
      keyParts: [customer.decodedToken.uid, slugBase || 'missing-slug'],
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
      ownerUid: customer.decodedToken.uid,
      ownerEmail: customer.decodedToken.email ?? null,
      ownerDisplayName: customer.decodedToken.name ?? null,
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
    console.error('[api/customer/events] failed to create owned event', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : '청첩장 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      },
      { status: 500 }
    );
  }
}
