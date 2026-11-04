import { getInvitationVisibility } from '../features/manage/invitationVisibility';
import type { LinkedInvitationCard } from './linkedInvitationCards';
import { buildInvitationShareLinks } from './invitationShareLinks';

export function buildMobileKakaoShareTarget(
  origin: string,
  card: Pick<LinkedInvitationCard, 'slug' | 'published' | 'displayPeriod'>,
  theme: string,
  now = Date.now()
) {
  const visibility = getInvitationVisibility(card.published, card.displayPeriod, now);
  if (!visibility.isPublic) {
    return { url: null, notice: `${visibility.label} 상태입니다. 공개 상태와 노출 기간을 확인한 뒤 공유해 주세요.` };
  }
  const links = buildInvitationShareLinks(origin, card.slug, theme);
  return links
    ? { url: links.kakaoShareUrl, notice: '' }
    : { url: null, notice: '공유할 청첩장 주소와 디자인을 확인하지 못했습니다.' };
}
