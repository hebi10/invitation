import { notFound } from 'next/navigation';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';

import ConnectOwnershipClient from './ConnectOwnershipClient';

export default async function ConnectOwnershipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let decodedSlug = '';

  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    notFound();
  }

  const normalizedSlug = normalizeInvitationPageSlugInput(decodedSlug);
  if (!normalizedSlug) {
    notFound();
  }

  return <ConnectOwnershipClient slug={normalizedSlug} />;
}
