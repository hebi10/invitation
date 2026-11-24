import { buildInvitationMediaGatewayUrl, isInvitationMediaFile, isInvitationMediaSlug } from './invitationMediaProjection';
import type { ServerEditableImageUploadResult } from './editableImageUploadService';

export const STABLE_MOBILE_MEDIA_VERSION = 'stable-v1';

/** The opt-in contract changes returned reference identity only. Legacy uploads are unchanged. */
export function projectMobileUploadReference(result: ServerEditableImageUploadResult, input: {
  slug: string; requestedVersion: string | null; ownerBound: boolean;
}, policy = {
  pilotSlug: process.env.INVITATION_MEDIA_GATEWAY_PILOT_SLUG ?? '',
  enabled: process.env.INVITATION_STABLE_MOBILE_UPLOAD_PILOT === 'true',
}): ServerEditableImageUploadResult {
  if (!policy.enabled || !policy.pilotSlug || policy.pilotSlug !== input.slug ||
      input.requestedVersion !== STABLE_MOBILE_MEDIA_VERSION || !input.ownerBound || !isInvitationMediaSlug(input.slug)) return result;
  const prefix = `wedding-images/${input.slug}/`;
  function convert(path: string) {
    const file = path.slice(prefix.length);
    if (!path.startsWith(prefix) || !isInvitationMediaFile(file)) throw new Error('Invalid uploaded image reference.');
    return buildInvitationMediaGatewayUrl(input.slug, file);
  }
  return { ...result, url: convert(result.path), originalUrl: convert(result.originalPath), thumbnailUrl: convert(result.thumbnailPath) };
}
