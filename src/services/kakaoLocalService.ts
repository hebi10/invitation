import { toUserFacingKoreanErrorMessage } from '@/lib/userFacingErrorMessage';
import { searchAddressWithKakaoMaps } from '@/utils/kakaoMaps';

export interface KakaoLocalAddressSearchResult {
  query: string;
  addressName: string;
  latitude: number;
  longitude: number;
}

const KAKAO_REST_API_ERROR_KEYWORD = 'Kakao Local REST API';

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; [key: string]: unknown }
    | null;

  if (!response.ok) {
    throw new Error(
      toUserFacingKoreanErrorMessage(
        typeof payload?.error === 'string' && payload.error.trim()
          ? payload.error
          : '주소 검색에 실패했습니다.'
      )
    );
  }

  return payload as T;
}

export async function searchKakaoLocalAddress(query: string) {
  const params = new URLSearchParams({ query });

  try {
    return await readJsonResponse<KakaoLocalAddressSearchResult>(
      await fetch(`/api/kakao/local/address-search?${params.toString()}`, {
        cache: 'no-store',
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';

    if (message.includes(KAKAO_REST_API_ERROR_KEYWORD)) {
      const fallbackResult = await searchAddressWithKakaoMaps(query);
      return {
        query,
        addressName: fallbackResult.addressName,
        latitude: fallbackResult.latitude,
        longitude: fallbackResult.longitude,
      };
    }

    throw new Error(toUserFacingKoreanErrorMessage(error, '주소 검색에 실패했습니다.'));
  }
}
