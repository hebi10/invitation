import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';

import {
  createWeddingInvitationLayout,
  getWeddingInvitationMetadata,
  weddingInvitationViewport,
} from '@/app/_components/WeddingInvitationLayout';
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

export const dynamic = 'force-dynamic';
export const viewport: Viewport = weddingInvitationViewport;

const Layout = createWeddingInvitationLayout({
  theme: DEFAULT_INVITATION_THEME,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getServerInvitationPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return getWeddingInvitationMetadata(page);
}

export default Layout;
