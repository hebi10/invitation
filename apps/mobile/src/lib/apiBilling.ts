import type {
  MobileInvitationCreationInput,
  MobileInvitationCreationResponse,
} from '../types/mobileInvitation';
import {
  buildApiUrl,
  createHeaders,
  fetchWithRetry,
  readJsonResponse,
} from './apiCore';
import type { MobileBillingPurchaseReceiptInput } from './apiTypes';

export async function fulfillMobileBillingPageCreation(
  baseUrl: string,
  payload: {
    purchase: MobileBillingPurchaseReceiptInput;
    input: MobileInvitationCreationInput;
    customerIdToken?: string | null;
  }
) {
  return readJsonResponse<MobileInvitationCreationResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/billing/fulfill'), {
      method: 'POST',
      headers: {
        ...createHeaders(payload.customerIdToken ?? undefined),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createInvitationPage',
        purchase: payload.purchase,
        createInput: {
          slugBase: payload.input.slugBase,
          groomKoreanName: payload.input.groomKoreanName,
          brideKoreanName: payload.input.brideKoreanName,
          groomEnglishName: payload.input.groomEnglishName,
          brideEnglishName: payload.input.brideEnglishName,
          theme: payload.input.theme,
        },
      }),
    })
  );
}

export async function fulfillMobileBillingTicketPack(
  baseUrl: string,
  payload: {
    purchase: MobileBillingPurchaseReceiptInput;
    targetPageSlug: string;
    targetToken: string;
  }
) {
  return readJsonResponse<{ success: boolean; ticketCount: number }>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/billing/fulfill'), {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'grantTicketPack',
        purchase: payload.purchase,
        targetPageSlug: payload.targetPageSlug,
        targetToken: payload.targetToken,
      }),
    })
  );
}
