import { NextResponse } from 'next/server';

import {
  getInvitationPageSlugValidationErrorMessage,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import { isMobileBillingProductId } from '@/lib/mobileBillingProducts';
import { GENERIC_SERVER_ERROR_MESSAGE } from '@/server/apiErrorResponse';
import {
  canCreateCustomerOwnedInvitation,
  CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE,
} from '@/server/customerAuthVerification';
import { getServerAuth } from '@/server/firebaseAdmin';
import {
  fulfillServerMobilePageCreationPurchase,
  fulfillServerMobileTicketPackPurchase,
} from '@/server/mobileBillingServerService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_BILLING_FULFILL_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
} as const;

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function verifyMobileCustomerRequest(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!idToken) {
    return {
      identity: null,
      response: NextResponse.json(
        { error: 'Customer authentication is required.' },
        { status: 401 }
      ),
    } as const;
  }

  const serverAuth = getServerAuth();
  if (!serverAuth) {
    return {
      identity: null,
      response: NextResponse.json(
        { error: GENERIC_SERVER_ERROR_MESSAGE },
        { status: 500 }
      ),
    } as const;
  }

  try {
    return {
      identity: await serverAuth.verifyIdToken(idToken),
      response: null,
    } as const;
  } catch {
    return {
      identity: null,
      response: NextResponse.json(
        { error: 'Customer authentication is required.' },
        { status: 401 }
      ),
    } as const;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          action?: unknown;
          purchase?: {
            appUserId?: unknown;
            productId?: unknown;
            transactionId?: unknown;
          };
          createInput?: {
            slugBase?: unknown;
            groomKoreanName?: unknown;
            brideKoreanName?: unknown;
            groomEnglishName?: unknown;
            brideEnglishName?: unknown;
            theme?: unknown;
          };
          targetPageSlug?: unknown;
          targetToken?: unknown;
        }
      | null;

    const action = readTrimmedString(body?.action);
    const purchase = body?.purchase;
    const appUserId = readTrimmedString(purchase?.appUserId);
    const productId = readTrimmedString(purchase?.productId);
    const transactionId = readTrimmedString(purchase?.transactionId);
    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'mobile-billing-fulfill',
      keyParts: [
        action || 'unknown-action',
        appUserId || 'missing-user',
        productId || 'missing-product',
      ],
      ...MOBILE_BILLING_FULFILL_RATE_LIMIT,
    });
    const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many billing fulfillment requests. Please try again later.' },
        {
          status: 429,
          headers: rateLimitHeaders,
        }
      );
    }

    if (!appUserId || !isMobileBillingProductId(productId) || !transactionId) {
      return NextResponse.json(
        { error: 'Google Play purchase information is required.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (action === 'createInvitationPage') {
      const createInput = body?.createInput;
      const slugBase = readTrimmedString(createInput?.slugBase);
      const groomKoreanName = readTrimmedString(createInput?.groomKoreanName);
      const brideKoreanName = readTrimmedString(createInput?.brideKoreanName);
      const groomEnglishName = readTrimmedString(createInput?.groomEnglishName);
      const brideEnglishName = readTrimmedString(createInput?.brideEnglishName);
      const theme = readTrimmedString(createInput?.theme);

      if (
        !slugBase ||
        !groomKoreanName ||
        !brideKoreanName ||
        !groomEnglishName ||
        !brideEnglishName
      ) {
        return NextResponse.json(
          { error: 'Invitation page draft input is required.' },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      const customerAuth = await verifyMobileCustomerRequest(request);
      if (customerAuth.response) {
        return customerAuth.response;
      }

      if (!canCreateCustomerOwnedInvitation(customerAuth.identity)) {
        return NextResponse.json(
          { error: CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE },
          { status: 403, headers: rateLimitHeaders }
        );
      }

      if (appUserId !== customerAuth.identity.uid) {
        return NextResponse.json(
          { error: 'Google Play purchase information is required.' },
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

      const response = await fulfillServerMobilePageCreationPurchase(
        new URL(request.url).origin,
        {
          appUserId,
          productId,
          transactionId,
        },
        {
          slugBase: slugValidation.normalizedSlugBase,
          groomKoreanName,
          brideKoreanName,
          groomEnglishName,
          brideEnglishName,
          theme,
          ownerUid: customerAuth.identity.uid,
          ownerEmail:
            typeof customerAuth.identity.email === 'string'
              ? customerAuth.identity.email
              : null,
          ownerDisplayName:
            typeof customerAuth.identity.name === 'string'
              ? customerAuth.identity.name
              : null,
        }
      );

      return NextResponse.json(response, { headers: rateLimitHeaders });
    }

    if (action === 'grantTicketPack') {
      const targetPageSlug = readTrimmedString(body?.targetPageSlug);
      const targetToken = readTrimmedString(body?.targetToken);

      if (!targetPageSlug || !targetToken) {
        return NextResponse.json(
          { error: 'Target page slug and session are required.' },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      const response = await fulfillServerMobileTicketPackPurchase(
        {
          appUserId,
          productId,
          transactionId,
        },
        targetPageSlug,
        targetToken
      );

      return NextResponse.json(response, { headers: rateLimitHeaders });
    }

    return NextResponse.json(
      { error: 'Unsupported action.' },
      { status: 400, headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error('[mobile/billing/fulfill] failed to process request', error);
    return NextResponse.json(
      { error: GENERIC_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}
