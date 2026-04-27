import { NextResponse } from 'next/server';

import {
  getInvitationPageSlugValidationErrorMessage,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import { isMobileBillingProductId } from '@/lib/mobileBillingProducts';
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
            password?: unknown;
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
      const password = readTrimmedString(createInput?.password);
      const theme = readTrimmedString(createInput?.theme);

      if (!slugBase || !groomKoreanName || !brideKoreanName || !password) {
        return NextResponse.json(
          { error: 'Invitation page draft input is required.' },
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
          password,
          theme,
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
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to fulfill the Google Play purchase.',
      },
      { status: 500 }
    );
  }
}
