import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';

import {
  createWeddingInvitationLayout,
  getWeddingInvitationMetadata,
  weddingInvitationViewport,
} from '@/app/_components/WeddingInvitationLayout';
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';

import { getCachedServerInvitationPageBySlug } from './serverInvitationPageCache';

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
  const page = await getCachedServerInvitationPageBySlug(slug);

  if (page) {
    return getWeddingInvitationMetadata(page);
  }

  const previewPage = await getCachedServerInvitationPageBySlug(slug, true);

  if (!previewPage) {
    notFound();
  }

  return getWeddingInvitationMetadata(null);
}

export default Layout;
