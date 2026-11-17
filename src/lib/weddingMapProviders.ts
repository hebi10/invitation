export const WEDDING_MAP_PROVIDERS = ['naver', 'kakao', 'google'] as const;
export type WeddingMapProvider = (typeof WEDDING_MAP_PROVIDERS)[number];
export const WEDDING_MAP_PROVIDER_LABELS: Record<WeddingMapProvider, string> = {
  naver: '네이버 지도',
  kakao: '카카오맵',
  google: '구글 지도',
};

export function normalizeWeddingMapProviders(value: unknown): WeddingMapProvider[] {
  if (value === undefined) return [...WEDDING_MAP_PROVIDERS];
  if (!Array.isArray(value)) return [];
  return WEDDING_MAP_PROVIDERS.filter((provider) => value.includes(provider));
}

export function hasValidWeddingMapCoordinates(latitude: unknown, longitude: unknown) {
  return typeof latitude === 'number' && typeof longitude === 'number'
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    && !(latitude === 0 && longitude === 0);
}

export type WeddingMapDestination = {
  venueName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function buildWeddingMapProviderUrl(provider: WeddingMapProvider, destination: WeddingMapDestination) {
  const address = destination.address.trim();
  const venueName = destination.venueName.trim();
  const hasCoordinates = hasValidWeddingMapCoordinates(destination.latitude, destination.longitude);
  if (!address && !hasCoordinates) return '';

  if (provider === 'naver') {
    // HTTPS search is usable without an installed Naver Map app.
    return `https://map.naver.com/p/search/${encodeURIComponent(address || venueName)}`;
  }
  if (provider === 'kakao') {
    if (hasCoordinates) {
      return `https://map.kakao.com/link/to/${encodeURIComponent(venueName || address || '목적지')},${destination.latitude},${destination.longitude}`;
    }
    return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
  }
  if (provider === 'google') {
    if (hasCoordinates) {
      const coordinates = `${destination.latitude},${destination.longitude}`;
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return '';
}
