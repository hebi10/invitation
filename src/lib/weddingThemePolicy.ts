import { normalizeEventTypeKey } from '@/lib/eventTypes';
import { getWeddingPreviewThemeKeys, isWeddingPreviewThemeKey } from '@/lib/eventPreviewLinks';
import { buildInvitationThemeRoutePath, DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import { buildInvitationVariants } from '@/lib/invitationVariants';
import type { InvitationPageSeed } from '@/types/invitationPage';

// Legacy availability flags remain in storage for compatibility, but wedding
// designs are chosen by URL and are no longer enabled separately per invitation.
export function withWeddingThemeAvailability<T extends InvitationPageSeed>(config: T): T {
  if (normalizeEventTypeKey(config.eventType) !== 'wedding') return config;
  const variants = { ...config.variants };
  const defaults = buildInvitationVariants(config.slug, config.displayName);
  for (const theme of getWeddingPreviewThemeKeys()) {
    variants[theme] = {
      ...defaults[theme]!,
      ...variants[theme],
      available: true,
      path: buildInvitationThemeRoutePath(config.slug, theme),
    };
  }
  return { ...config, variants };
}

export function resolveWeddingRouteTheme(
  page: InvitationPageSeed | null | undefined,
  requestedTheme?: string | null,
  defaultTheme?: string | null
) {
  if (!page) return null;
  if (requestedTheme != null) {
    return isWeddingPreviewThemeKey(requestedTheme) ? requestedTheme : null;
  }
  return isWeddingPreviewThemeKey(defaultTheme) ? defaultTheme : DEFAULT_INVITATION_THEME;
}
