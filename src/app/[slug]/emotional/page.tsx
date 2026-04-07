import { notFound } from 'next/navigation';

import { WeddingInvitationRoutePage } from '@/app/_components/WeddingInvitationPage';
import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

export const dynamic = 'force-dynamic';

export default async function WeddingInvitationEmotionalRoutePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getServerInvitationPageBySlug(slug);

  if (!page?.variants.emotional?.available) {
    notFound();
  }

  return (
    <WeddingInvitationRoutePage
      slug={slug}
      theme="emotional"
      initialPageConfig={page}
    />
  );
}
