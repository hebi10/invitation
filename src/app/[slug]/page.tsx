import { notFound } from 'next/navigation';

import { resolveEventPageRenderer } from '@/app/_components/eventPageRendererRegistry';

import {
  getCachedServerInvitationPreviewBySlug,
  getCachedServerInvitationPageDefaultThemeBySlug,
  getCachedServerPublicInvitationPageBySlug,
} from './serverInvitationPageCache';
import { getServerInvitationPageEventTypeBySlug } from '@/server/invitationPageServerService';

export const dynamic = 'force-dynamic';

export default async function EventInvitationSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, previewPage, defaultTheme, eventType] = await Promise.all([
    getCachedServerPublicInvitationPageBySlug(slug),
    getCachedServerInvitationPreviewBySlug(slug),
    getCachedServerInvitationPageDefaultThemeBySlug(slug),
    getServerInvitationPageEventTypeBySlug(slug),
  ]);
  const { renderer, resolvedEventType } = resolveEventPageRenderer(eventType);

  const theme = renderer.resolveRouteTheme(previewPage, null, defaultTheme);

  if (!previewPage || !theme) {
    notFound();
  }

  return renderer.renderPage({
    slug,
    theme,
    initialPageConfig: page ?? undefined,
    eventType: resolvedEventType,
  });
}
