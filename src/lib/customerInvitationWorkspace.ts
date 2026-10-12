import type { InvitationPublicAccessState } from './invitationPublicAccess';
import type { InvitationThemeKey } from './invitationThemes';

export function buildCustomerInvitationPreviewPath(slug: string, theme: InvitationThemeKey) {
  return `/my-invitations/preview/${encodeURIComponent(slug)}/${encodeURIComponent(theme)}`;
}

export function getCustomerInvitationStatus(published: boolean, access?: InvitationPublicAccessState | null) {
  return {
    isPublic: access?.isPublic ?? false,
    label: access ? (access.isPublic ? '노출 중' : access.adminLabel) : published ? '공개 설정됨' : '비공개',
    description: access?.adminDescription ?? null,
  };
}
