export const DEFAULT_PUBLIC_SITE_URL = 'https://invite.msgnote.kr';

export function getPublicSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const siteUrl = new URL(value?.trim() || DEFAULT_PUBLIC_SITE_URL);

    if (siteUrl.protocol !== 'https:' && siteUrl.protocol !== 'http:') {
      throw new Error('Unsupported public site URL protocol.');
    }

    return siteUrl;
  } catch {
    return new URL(DEFAULT_PUBLIC_SITE_URL);
  }
}

export const PUBLIC_SITE_URL = getPublicSiteUrl();
export const PUBLIC_SITE_ORIGIN = PUBLIC_SITE_URL.origin;

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
