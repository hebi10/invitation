import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { eventInvitationViewport } from '@/app/_components/EventInvitationLayout';
import { resolveEventPageRenderer } from '@/app/_components/eventPageRendererRegistry';
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import { getServerInvitationPageEventTypeBySlug } from '@/server/invitationPageServerService';

import {
  getCachedServerInvitationPreviewBySlug,
  getCachedServerPublicInvitationPageBySlug,
} from './serverInvitationPageCache';

export const dynamic = 'force-dynamic';
export const viewport: Viewport = eventInvitationViewport;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [page, eventType] = await Promise.all([
    getCachedServerPublicInvitationPageBySlug(slug),
    getServerInvitationPageEventTypeBySlug(slug),
  ]);
  const { renderer } = resolveEventPageRenderer(eventType);

  if (page) {
    return renderer.getMetadata(page);
  }

  const previewPage = await getCachedServerInvitationPreviewBySlug(slug);

  if (!previewPage) {
    notFound();
  }

  return renderer.getMetadata(null);
}

export default async function EventInvitationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const eventType = await getServerInvitationPageEventTypeBySlug(slug);
  const { renderer } = resolveEventPageRenderer(eventType);
  const Layout = renderer.createLayout(DEFAULT_INVITATION_THEME);

  return <Layout>{children}</Layout>;
}
