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

export function getCustomerGuestLinkMessage(published: boolean, access?: InvitationPublicAccessState | null) {
  if (access?.isPublic) return '하객이 지금 링크를 열 수 있습니다.';
  if (!access && published) return '하객 링크의 공개 상태를 확인하지 못했습니다.';
  if (!access || access.reason === 'private') return '비공개 상태라 하객이 링크를 열 수 없습니다.';

  return `하객이 링크를 열 수 없습니다. ${access.adminDescription ?? access.adminLabel}`;
}
