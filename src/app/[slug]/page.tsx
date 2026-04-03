import { notFound } from 'next/navigation';

import { WeddingInvitationRoutePage } from '@/app/_components/WeddingInvitationPage';
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
  const theme = defaultTheme === 'simple' ? 'simple' : 'emotional';

  if (!page?.variants[theme]?.available) {
    notFound();
  }

  return (
    <WeddingInvitationRoutePage
      slug={slug}
      theme={theme}
      initialPageConfig={page}
    />
  );
}
