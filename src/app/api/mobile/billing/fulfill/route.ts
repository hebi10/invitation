import { NextResponse } from 'next/server';

import {
  getInvitationPageSlugValidationErrorMessage,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import { isMobileBillingProductId } from '@/lib/mobileBillingProducts';
import { canOpenOwnedWeddingPage } from '@/lib/mobileAccountOwnership';
import { getCustomerEventOwnershipSnapshot } from '@/server/customerEventsService';
import { GENERIC_SERVER_ERROR_MESSAGE } from '@/server/apiErrorResponse';
import {
  canCreateCustomerOwnedInvitation,
  CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE,
} from '@/server/customerAuthVerification';
import {
  CustomerApiAuthError,
  verifyCustomerRequest,
} from '@/server/customerApiAuth';
import {
  fulfillServerMobilePageCreationPurchase,
  fulfillServerMobileTicketPackPurchase,
  fulfillServerMobilePeriodExtensionPurchase,
} from '@/server/mobileBillingServerService';
import { readMobileClientEditorDeviceId } from '@/server/clientEditorMobileApi';
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
  try {
    return {
      identity: await verifyCustomerRequest(request),
      response: null,
    } as const;
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return {
        identity: null,
        response: NextResponse.json(
          {
            error:
              error.status === 401
                ? 'Customer authentication is required.'
                : GENERIC_SERVER_ERROR_MESSAGE,
          },
          { status: error.status }
        ),
      } as const;
    }

    throw error;
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
            purchaseToken?: unknown;
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
    const purchaseToken = readTrimmedString(purchase?.purchaseToken);
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
        !brideKoreanName
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
          purchaseToken,
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
          deviceId: readMobileClientEditorDeviceId(request),
        }
      );

      return NextResponse.json(response, { headers: rateLimitHeaders });
    }

    if (action === 'extendInvitationPeriod') {
      const targetPageSlug = readTrimmedString(body?.targetPageSlug);
      if (!targetPageSlug || targetPageSlug.length > 100 ||
          !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(targetPageSlug)) {
        return NextResponse.json(
          { error: '청첩장 주소 형식이 올바르지 않습니다.' },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      const customer = await verifyCustomerRequest(request, { requireVerified: true });
      if (appUserId !== customer.uid) {
        return NextResponse.json(
          { error: '결제한 고객 계정으로 다시 로그인해 주세요.' },
          { status: 403, headers: rateLimitHeaders }
        );
      }
      const ownership = await getCustomerEventOwnershipSnapshot(customer.uid, targetPageSlug);
      if (!ownership.summary || !canOpenOwnedWeddingPage(ownership, targetPageSlug)) {
        return NextResponse.json(
          { error: '이 계정으로 관리할 수 있는 청첩장이 아닙니다.' },
          { status: 403, headers: rateLimitHeaders }
        );
      }

      const response = await fulfillServerMobilePeriodExtensionPurchase(
        { appUserId, productId, transactionId, purchaseToken },
        targetPageSlug,
        customer.uid
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
          purchaseToken,
        },
        targetPageSlug,
        targetToken,
        {
          deviceId: readMobileClientEditorDeviceId(request),
        }
      );

      return NextResponse.json(response, { headers: rateLimitHeaders });
    }

    return NextResponse.json(
      { error: 'Unsupported action.' },
      { status: 400, headers: rateLimitHeaders }
    );
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return NextResponse.json(
        { error: error.status === 401 ? '고객 계정 로그인이 필요합니다.' : CUSTOMER_EMAIL_VERIFICATION_REQUIRED_MESSAGE },
        { status: error.status }
      );
    }
    if (
      typeof error === 'object' && error !== null && 'code' in error &&
      error.code === 'billing-fulfillment-requires-review'
    ) {
      return NextResponse.json({
        code: 'BILLING_REVIEW_REQUIRED',
        error: '이전 결제의 지급 여부를 확인해야 합니다. 추가 결제하지 말고 고객 문의로 결제 내역을 확인해 주세요.',
      }, { status: 409 });
    }
    console.error('[mobile/billing/fulfill] failed to process request', error);
    return NextResponse.json(
      { error: GENERIC_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}
