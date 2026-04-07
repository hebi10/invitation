import { notFound, redirect } from 'next/navigation';

import { WeddingInvitationRoutePage } from '@/app/_components/WeddingInvitationPage';
import { resolveAvailableInvitationVariant } from '@/lib/invitationVariants';
import {
  getServerInvitationPageBySlug,
  getServerInvitationPageDefaultThemeBySlug,
} from '@/server/invitationPageServerService';

export const dynamic = 'force-dynamic';

export default async function WeddingInvitationEmotionalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, defaultTheme] = await Promise.all([
    getServerInvitationPageBySlug(slug),
    getServerInvitationPageDefaultThemeBySlug(slug),
  ]);
  const preferredTheme = defaultTheme === 'simple' ? 'simple' : 'emotional';
  const theme = resolveAvailableInvitationVariant(page?.variants, preferredTheme);

  if (!page || !theme) {
    notFound();
  }

  if (theme === 'simple') {
    redirect(`/${slug}/simple`);
  }

  return (
    <WeddingInvitationRoutePage
      slug={slug}
      theme="emotional"
      initialPageConfig={page}
    />
  );
}
