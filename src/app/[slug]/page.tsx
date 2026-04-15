import { notFound } from 'next/navigation';

import { WeddingInvitationRoutePage } from '@/app/_components/WeddingInvitationPage';
import {
  DEFAULT_INVITATION_THEME,
  normalizeInvitationThemeKey,
} from '@/lib/invitationThemes';
import { resolveAvailableInvitationVariant } from '@/lib/invitationVariants';

import {
  getCachedServerInvitationPageBySlug,
  getCachedServerInvitationPageDefaultThemeBySlug,
  getCachedServerInvitationPreviewBySlug,
} from './serverInvitationPageCache';

export const dynamic = 'force-dynamic';

export default async function WeddingInvitationSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, previewPage, defaultTheme] = await Promise.all([
    getCachedServerInvitationPageBySlug(slug),
    getCachedServerInvitationPreviewBySlug(slug),
    getCachedServerInvitationPageDefaultThemeBySlug(slug),
  ]);

  const preferredTheme = normalizeInvitationThemeKey(
    defaultTheme,
    DEFAULT_INVITATION_THEME
  );
  const theme = resolveAvailableInvitationVariant(previewPage?.variants, preferredTheme);

  if (!previewPage || !theme) {
    notFound();
  }

  return (
    <WeddingInvitationRoutePage
      slug={slug}
      theme={theme}
      initialPageConfig={page ?? undefined}
    />
  );
}
