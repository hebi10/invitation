interface CoverImageOptions {
  configuredUrl: string;
  matchingThumbnailUrl?: string;
  fallbackUrl?: string;
  fallbackThumbnailUrl?: string;
}

// 지정된 대표 사진은 저장소 목록이 늦게 도착해도 다른 사진으로 교체하지 않습니다.
export function resolveWeddingCoverImage(options: CoverImageOptions) {
  const configuredUrl = options.configuredUrl.trim();
  const mainImageUrl = configuredUrl || options.fallbackUrl?.trim() || '';
  const heroImageUrl = configuredUrl
    ? options.matchingThumbnailUrl?.trim() || configuredUrl
    : options.fallbackThumbnailUrl?.trim() || mainImageUrl;

  return { mainImageUrl, heroImageUrl };
}
