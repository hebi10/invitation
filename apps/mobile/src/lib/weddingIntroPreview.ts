import { normalizeWeddingIntroStyle, type WeddingIntroStyle } from './weddingIntro';

/**
 * The Android editor previews the shared public web animation with sample data.
 * Never place the couple's draft, owner token, or private photo URL in this link.
 */
export function buildWeddingIntroSamplePreviewUrl(apiBaseUrl: string, style: WeddingIntroStyle) {
  const url = new URL('/mobile-intro-preview/', apiBaseUrl);
  url.searchParams.set('style', normalizeWeddingIntroStyle(style));
  return url.toString();
}
