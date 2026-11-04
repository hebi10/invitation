import { getEventThemeDefinition } from '@/app/_components/eventPageThemes';
import { normalizeKakaoShareImageUrl } from '@/app/_components/kakaoShareUtils';
import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';
import { buildInvitationSharePaths } from '@/lib/invitationShareLinks';
import type { InvitationPage } from '@/types/invitationPage';

function normalizeShareImage(value: unknown) {
  const source = typeof value === 'string' ? value.trim() : '';
  const imageUrl = normalizeKakaoShareImageUrl(source, 'https://mobile-share.invalid');
  if (!imageUrl) return '';
  if (/^[a-z][a-z\d+.-]*:|^[\\/]{2}/i.test(source)) return imageUrl;
  const image = new URL(imageUrl);
  return `${image.pathname}${image.search}${image.hash}`;
}

export function buildMobileInvitationShareModel(
  page: InvitationPage,
  theme: string,
  now = new Date()
) {
  if ((page.eventType ?? 'wedding') !== 'wedding' || !getInvitationPublicAccessState(page, now).isPublic) return null;
  const paths = buildInvitationSharePaths(page.slug, theme);
  if (!paths) return null;
  const definition = getEventThemeDefinition(theme);
  const images = [...new Set([
    page.metadata.images.kakaoCard,
    page.metadata.images.social,
    page.metadata.images.wedding,
    page.pageData?.galleryImages?.[0],
  ].map(normalizeShareImage).filter(Boolean))];
  return {
    publicPath: paths.publicPath,
    title: definition.getShareTitle(page),
    description: definition.getShareDescription(page),
    imageUrl: images[0] ?? '',
    fallbackImageUrl: images[1] ?? '',
  };
}
