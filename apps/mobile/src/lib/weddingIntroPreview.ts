import { normalizeWeddingIntroStyle, type WeddingIntroStyle } from './weddingIntro';
import { getInvitationIntroPreset, type InvitationIntroPresetId } from './invitationIntroCatalog';

/**
 * The Android editor previews the shared public web animation with sample data.
 * Never place the couple's draft, owner token, or private photo URL in this link.
 */
export function buildWeddingIntroSamplePreviewUrl(apiBaseUrl: string, style: WeddingIntroStyle) {
  const url = new URL('/mobile-intro-preview/', apiBaseUrl);
  url.searchParams.set('style', normalizeWeddingIntroStyle(style));
  return url.toString();
}

/** Preview a registered GIF with sample data only; never include customer details. */
export function buildInvitationIntroSamplePreviewUrl(apiBaseUrl: string, presetId: InvitationIntroPresetId) {
  if (!getInvitationIntroPreset(presetId)) {
    throw new Error('Unknown invitation intro preset');
  }
  const url = new URL('/mobile-gif-intro-preview/', apiBaseUrl);
  url.searchParams.set('preset', presetId);
  return url.toString();
}
