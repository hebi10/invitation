import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isInvitationThemeKey } from '@/lib/invitationThemes';
import MobileInvitationPreviewClient from './MobileInvitationPreviewClient';

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function PreviewPage({ params }: { params: Promise<{ slug: string; theme: string }> }) {
  const { slug, theme } = await params;
  if (!isInvitationThemeKey(theme)) notFound();
  return <MobileInvitationPreviewClient slug={slug} theme={theme} />;
}
