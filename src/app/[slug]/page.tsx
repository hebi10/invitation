import { notFound, redirect } from 'next/navigation';

import {
  buildInvitationThemeRoutePath,
  DEFAULT_INVITATION_THEME,
  normalizeInvitationThemeKey,
} from '@/lib/invitationThemes';
import { resolveAvailableInvitationVariant } from '@/lib/invitationVariants';
import {
  getServerInvitationPageBySlug,
  getServerInvitationPageDefaultThemeBySlug,
} from '@/server/invitationPageServerService';

export const dynamic = 'force-dynamic';

export default async function WeddingInvitationSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, defaultTheme] = await Promise.all([
    getServerInvitationPageBySlug(slug),
    getServerInvitationPageDefaultThemeBySlug(slug),
  ]);
  const preferredTheme = normalizeInvitationThemeKey(
    defaultTheme,
    DEFAULT_INVITATION_THEME
  );
  const theme = resolveAvailableInvitationVariant(page?.variants, preferredTheme);

  if (!page || !theme) {
    notFound();
  }

  redirect(buildInvitationThemeRoutePath(slug, theme));
}
