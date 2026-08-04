export const PUBLIC_SITE_URL = new URL('https://msgnote.kr');

const LEGACY_FAVICON_PATHS = new Set(['/images/favicon.ico']);

export function resolveInvitationFaviconUrl(value: unknown): string {
  const faviconUrl = typeof value === 'string' ? value.trim() : '';

  if (!faviconUrl || LEGACY_FAVICON_PATHS.has(faviconUrl)) {
    return '/favicon.ico';
  }

  return faviconUrl;
}

export function resolveInvitationAssetUrl(value: string, baseUrl: string | URL): string {
  const assetUrl = value.trim();

  if (!assetUrl) {
    return '';
  }

  try {
    return new URL(assetUrl, baseUrl).toString();
  } catch {
    return assetUrl;
  }
}
