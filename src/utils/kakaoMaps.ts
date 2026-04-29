import { getPublicKakaoJavaScriptKey } from '@/lib/publicRuntimeConfig';
import type { KakaoAddressSearchResult, KakaoMapsSdk } from '@/types/kakao';

const KAKAO_MAPS_SCRIPT_ID = 'kakao-maps-sdk';
const LEGACY_KAKAO_MAPS_COMPAT_KEY = '234add558ffec30aa714eb4644df46e3';
let kakaoMapsSdkPromise: Promise<KakaoMapsSdk> | null = null;

function buildKakaoMapsSdkUrl(appKey: string) {
  const params = new URLSearchParams({
    appkey: appKey,
    autoload: 'false',
    libraries: 'services',
  });

  return `https://dapi.kakao.com/v2/maps/sdk.js?${params.toString()}`;
}

export async function loadKakaoMapsSdk(): Promise<KakaoMapsSdk> {
  if (typeof window === 'undefined') {
    throw new Error('Kakao Maps SDK can only be loaded in the browser.');
  }

  const currentKakao = window.kakao;
  if (currentKakao?.maps) {
    if (typeof currentKakao.maps.load === 'function') {
      await new Promise<void>((resolve) => {
        currentKakao.maps.load?.(() => resolve());
      });
    }
    return currentKakao;
  }

  if (!kakaoMapsSdkPromise) {
    kakaoMapsSdkPromise = new Promise((resolve, reject) => {
      const keyCandidates = Array.from(
        new Set(
          [getPublicKakaoJavaScriptKey(), LEGACY_KAKAO_MAPS_COMPAT_KEY]
            .map((candidate) => candidate.trim())
            .filter(Boolean)
        )
      );

      if (keyCandidates.length === 0) {
        kakaoMapsSdkPromise = null;
        reject(
          new Error(
            'Missing Kakao JavaScript key. Set NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY or NEXT_PUBLIC_KAKAO_MAP_API_KEY.'
          )
        );
        return;
      }

      const onReady = () => {
        const loadedKakao = window.kakao;
        if (!loadedKakao?.maps) {
          kakaoMapsSdkPromise = null;
          reject(new Error('Kakao Maps SDK did not initialize correctly.'));
          return;
        }

        if (typeof loadedKakao.maps.load === 'function') {
          loadedKakao.maps.load(() => resolve(loadedKakao));
          return;
        }

        resolve(loadedKakao);
      };

      const tryLoadWithKey = (candidateIndex: number) => {
        const appKey = keyCandidates[candidateIndex];
        if (!appKey) {
          kakaoMapsSdkPromise = null;
          reject(new Error('Failed to resolve Kakao Maps SDK key.'));
          return;
        }

        const retryOrReject = () => {
          const existing = document.getElementById(KAKAO_MAPS_SCRIPT_ID);
          if (existing?.parentNode) {
            existing.parentNode.removeChild(existing);
          }

          if (candidateIndex + 1 < keyCandidates.length) {
            console.warn(
              '[kakaoMaps] failed to load SDK with current key, retrying compatibility key'
            );
            tryLoadWithKey(candidateIndex + 1);
            return;
          }

          kakaoMapsSdkPromise = null;
          reject(new Error('Failed to load Kakao Maps SDK.'));
        };

        const existingScript = document.getElementById(
          KAKAO_MAPS_SCRIPT_ID
        ) as HTMLScriptElement | null;

        if (existingScript) {
          const existingKey = existingScript.dataset.appKey ?? '';
          const scriptReadyState =
            'readyState' in existingScript
              ? String(
                  (existingScript as HTMLScriptElement & { readyState?: string }).readyState ?? ''
                )
              : '';
          const isLoaded =
            existingScript.dataset.loaded === 'true' ||
            scriptReadyState === 'complete' ||
            scriptReadyState === 'loaded' ||
            Boolean(window.kakao?.maps);

          if (isLoaded && (!existingKey || existingKey === appKey)) {
            onReady();
            return;
          }

          if (existingKey && existingKey !== appKey) {
            existingScript.remove();
          } else {
            existingScript.addEventListener(
              'load',
              () => {
                existingScript.dataset.loaded = 'true';
                onReady();
              },
              { once: true }
            );
            existingScript.addEventListener('error', retryOrReject, { once: true });
            return;
          }
        }

        const script = document.createElement('script');
        script.id = KAKAO_MAPS_SCRIPT_ID;
        script.async = true;
        script.defer = true;
        script.dataset.appKey = appKey;
        script.src = buildKakaoMapsSdkUrl(appKey);
        script.addEventListener(
          'load',
          () => {
            script.dataset.loaded = 'true';
            onReady();
          },
          { once: true }
        );
        script.addEventListener('error', retryOrReject, { once: true });
        document.head.appendChild(script);
      };

      tryLoadWithKey(0);
    });
  }

  return kakaoMapsSdkPromise;
}

export async function searchAddressWithKakaoMaps(address: string) {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) {
    throw new Error('검색할 주소를 먼저 입력해 주세요.');
  }

  const kakao = await loadKakaoMapsSdk();
  const geocoder = new kakao.maps.services.Geocoder();

  return new Promise<{
    addressName: string;
    latitude: number;
    longitude: number;
  }>((resolve, reject) => {
    geocoder.addressSearch(trimmedAddress, (result: KakaoAddressSearchResult[], status) => {
      if (status !== kakao.maps.services.Status.OK || !Array.isArray(result) || !result[0]) {
        reject(new Error('입력한 주소에 해당하는 좌표를 찾지 못했습니다.'));
        return;
      }

      const primary = result[0];
      const addressName =
        String(primary.road_address?.address_name ?? '').trim() ||
        String(primary.address?.address_name ?? '').trim() ||
        String(primary.address_name ?? '').trim() ||
        trimmedAddress;
      const latitude = Number(primary.y);
      const longitude = Number(primary.x);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        reject(new Error('입력한 주소에 해당하는 좌표를 찾지 못했습니다.'));
        return;
      }

      resolve({
        addressName,
        latitude,
        longitude,
      });
    });
  });
}

export function buildKakaoMapSearchUrl(address: string) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
}

export function buildKakaoMapPinUrl(placeName: string, latitude: number, longitude: number) {
  return `https://map.kakao.com/link/map/${placeName},${latitude},${longitude}`;
}

export function buildNaverMapSearchUrl(address: string) {
  return `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;
}

export function buildGoogleMapSearchUrl(address: string) {
  return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
}

export function buildGoogleMapApiSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
