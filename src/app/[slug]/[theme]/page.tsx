import { notFound } from 'next/navigation';

import { resolveEventPageRenderer } from '@/app/_components/eventPageRendererRegistry';
import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';

import {
  getCachedServerInvitationPageBySlug,
  getCachedServerPublicInvitationPageBySlug,
} from '../serverInvitationPageCache';
import { getServerInvitationPageEventTypeBySlug } from '@/server/invitationPageServerService';

export const dynamic = 'force-dynamic';

export default async function EventInvitationThemeRoutePage({
  params,
}: {
  params: Promise<{ slug: string; theme: string }>;
}) {
  const { slug, theme } = await params;
  const normalizedTheme = theme.trim().toLowerCase();
  const eventType = await getServerInvitationPageEventTypeBySlug(slug);
  const { renderer, resolvedEventType } = resolveEventPageRenderer(eventType);

  if (!renderer.isThemeSupported(normalizedTheme)) {
    notFound();
  }

  const [page, previewPage] = await Promise.all([
    getCachedServerPublicInvitationPageBySlug(slug),
    getCachedServerInvitationPageBySlug(slug, true),
  ]);
  const routePreviewPage = page ?? previewPage;
  const resolvedTheme = renderer.resolveRouteTheme(routePreviewPage, normalizedTheme);

  if (!routePreviewPage || !resolvedTheme || resolvedTheme !== normalizedTheme) {
    notFound();
  }

  return renderer.renderPage({
    slug,
    theme: resolvedTheme,
    initialPageConfig: page ?? undefined,
    initialBlockMessage:
      !page && previewPage
        ? getInvitationPublicAccessState(previewPage).visitorMessage
        : null,
    eventType: resolvedEventType,
  });
}
