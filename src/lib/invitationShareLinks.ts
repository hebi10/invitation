import { buildInvitationThemeRoutePath, getSelectableInvitationThemeKeys, type InvitationThemeKey } from './invitationThemes';

export function buildInvitationSharePaths(slug: string, theme: string) {
  const normalizedSlug = slug.trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,119}$/i.test(normalizedSlug) ||
    !getSelectableInvitationThemeKeys().includes(theme as InvitationThemeKey)) return null;

  return {
    publicPath: buildInvitationThemeRoutePath(normalizedSlug, theme as InvitationThemeKey),
    kakaoSharePath: `/mobile-share/${normalizedSlug}/${theme}`,
  };
}

export function buildInvitationShareLinks(origin: string, slug: string, theme: string) {
  const paths = buildInvitationSharePaths(slug, theme);
  if (!paths) return null;

  try {
    const site = new URL(origin);
    if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password) return null;
    return {
      publicUrl: `${site.origin}${paths.publicPath}`,
      kakaoShareUrl: `${site.origin}${paths.kakaoSharePath}`,
    };
  } catch {
    return null;
  }
}
