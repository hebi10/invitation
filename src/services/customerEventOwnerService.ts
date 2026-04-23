import { toUserFacingKoreanErrorMessage } from '@/lib/userFacingErrorMessage';
import { getCurrentFirebaseIdToken } from '@/services/adminAuth';

async function getRequiredIdToken() {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');
  }

  return idToken;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; [key: string]: unknown }
    | null;

  if (!response.ok) {
    throw new Error(
      toUserFacingKoreanErrorMessage(
        typeof payload?.error === 'string' && payload.error.trim()
          ? payload.error
          : 'Request failed.'
      )
    );
  }

  return payload as T;
}

export async function setOwnedEventPassword(pageSlug: string, password: string) {
  const idToken = await getRequiredIdToken();

  return readJsonResponse<{
    success: boolean;
    pageSlug: string;
    passwordVersion: number;
  }>(
    await fetch('/api/customer/events/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        pageSlug,
        password,
      }),
    })
  );
}
