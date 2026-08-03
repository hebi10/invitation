import { notFound } from 'next/navigation';

import {
  DEFAULT_INVITATION_THEME,
  INVITATION_THEME_KEYS,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';

import ExperienceInvitationPreviewClient from './ExperienceInvitationPreviewClient';

export default async function ExperienceInvitationPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; theme?: string[] }>;
}) {
  const { slug, theme } = await params;
  const requestedTheme = (theme?.[0] ?? DEFAULT_INVITATION_THEME).trim().toLowerCase();
  if (!slug.trim() || !INVITATION_THEME_KEYS.includes(requestedTheme as InvitationThemeKey)) {
    notFound();
  }

  return (
    <ExperienceInvitationPreviewClient
      slug={slug}
      theme={requestedTheme as InvitationThemeKey}
    />
  );
}
