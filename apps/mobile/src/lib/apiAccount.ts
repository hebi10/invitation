import { buildApiUrl, createHeaders, fetchWithRetry, readJsonResponse } from './apiCore';
import type { MobileCustomerOwnedEvent } from '../types/mobileInvitation';
import type { MobileLoginResponse } from './apiTypes';

export async function listMobileCustomerInvitations(baseUrl: string, customerIdToken: string) {
  const result = await readJsonResponse<{ success: boolean; events: MobileCustomerOwnedEvent[] }>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/customer/events'), {
      method: 'GET',
      headers: createHeaders(customerIdToken),
    })
  );
  if (!result.success || !Array.isArray(result.events)) {
    throw new Error('계정 청첩장 목록을 불러올 수 없습니다.');
  }
  return result.events.filter((item) => item.eventType === 'wedding' && typeof item.slug === 'string');
}

export async function activateMobileCustomerInvitation(
  baseUrl: string,
  customerIdToken: string,
  pageSlug: string
) {
  return readJsonResponse<MobileLoginResponse>(
    await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/client-editor/accounts/activate'), {
      method: 'POST',
      headers: {
        ...createHeaders(customerIdToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pageSlug }),
    })
  );
}
