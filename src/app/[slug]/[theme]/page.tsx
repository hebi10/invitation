import { notFound } from 'next/navigation';

import { WeddingInvitationRoutePage } from '@/app/_components/WeddingInvitationPage';
import { isInvitationThemeKey } from '@/lib/invitationThemes';

import { getCachedServerInvitationPageBySlug } from '../serverInvitationPageCache';

export const dynamic = 'force-dynamic';

export default async function WeddingInvitationThemeRoutePage({
  params,
}: {
  params: Promise<{ slug: string; theme: string }>;
}) {
  const { slug, theme } = await params;
  const normalizedTheme = theme.trim().toLowerCase();

  if (!isInvitationThemeKey(normalizedTheme)) {
    notFound();
  }

  const page = await getCachedServerInvitationPageBySlug(slug);

  if (page?.variants[normalizedTheme]?.available) {
    return (
      <WeddingInvitationRoutePage
        slug={slug}
        theme={normalizedTheme}
        initialPageConfig={page}
      />
    );
  }

  const previewPage = await getCachedServerInvitationPageBySlug(slug, true);

  if (!previewPage?.variants[normalizedTheme]?.available) {
    notFound();
  }

  return <WeddingInvitationRoutePage slug={slug} theme={normalizedTheme} />;
}
