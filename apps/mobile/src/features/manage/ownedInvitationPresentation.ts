import type { MobileCustomerOwnedEvent } from '../../types/mobileInvitation';
import type { InvitationSummaryTone } from '../../components/InvitationSummaryCard';

type OwnedInvitationVisibilityInput = Pick<
  MobileCustomerOwnedEvent,
  'published' | 'publicAccess'
>;

export function getOwnedInvitationStatus(item: OwnedInvitationVisibilityInput): {
  label: string;
  tone: InvitationSummaryTone;
} {
  const confirmedVisible = item.publicAccess?.isPublic === true;
  const label = item.publicAccess?.adminLabel?.trim()
    || (confirmedVisible ? '공개 중' : item.published ? '공개 설정' : '비공개');

  return {
    label,
    tone: confirmedVisible
      ? 'success'
      : item.published && item.publicAccess
        ? 'notice'
        : 'neutral',
  };
}
