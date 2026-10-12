import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isInvitationThemeKey } from '@/lib/invitationThemes';
import CustomerInvitationPreviewClient from './CustomerInvitationPreviewClient';

export const metadata: Metadata = {
  title: '내 초대장 미리보기',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function CustomerPreviewPage({ params }: { params: Promise<{ slug: string; theme: string }> }) {
  const { slug, theme } = await params;
  if (!isInvitationThemeKey(theme)) notFound();
  return <CustomerInvitationPreviewClient slug={slug} theme={theme} />;
}
