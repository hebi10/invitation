import { notFound } from 'next/navigation';

import { WeddingInvitationRoutePage } from '@/app/_components/WeddingInvitationPage';
import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

export const dynamic = 'force-dynamic';

export default async function WeddingInvitationSimplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getServerInvitationPageBySlug(slug);

  if (!page?.variants.simple?.available) {
    notFound();
  }

  return (
    <WeddingInvitationRoutePage
      slug={slug}
      theme="simple"
      initialPageConfig={page}
    />
  );
}

