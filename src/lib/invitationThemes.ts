export const INVITATION_THEME_REGISTRY = [
  {
    key: 'emotional',
    label: '감성형',
    adminLabel: 'Emotional',
    variantLabel: 'Emotional',
    pathSuffix: '/emotional',
    wizardDescription: '사진과 분위기를 중심으로 보여주는 감성형 레이아웃입니다.',
    shareTitleMode: 'metadata',
    documentTitleSuffix: '',
    ariaLabelSuffix: '',
    isDefault: true,
  },
  {
    key: 'simple',
    label: '심플형',
    adminLabel: 'Simple',
    variantLabel: 'Simple',
    pathSuffix: '/simple',
    wizardDescription: '정보를 또렷하게 정리해 보여주는 심플형 레이아웃입니다.',
    shareTitleMode: 'couple',
    documentTitleSuffix: ' (Simple)',
    ariaLabelSuffix: ' (Simple)',
    isDefault: false,
  },
] as const;

export type InvitationThemeDefinition = (typeof INVITATION_THEME_REGISTRY)[number];
export type InvitationThemeKey = InvitationThemeDefinition['key'];

const invitationThemeByKey = Object.fromEntries(
  INVITATION_THEME_REGISTRY.map((theme) => [theme.key, theme])
) as Record<InvitationThemeKey, InvitationThemeDefinition>;

export const INVITATION_THEME_KEYS = INVITATION_THEME_REGISTRY.map(
  (theme) => theme.key
) as InvitationThemeKey[];

export const DEFAULT_INVITATION_THEME: InvitationThemeKey =
  INVITATION_THEME_REGISTRY.find((theme) => theme.isDefault)?.key ??
  INVITATION_THEME_REGISTRY[0].key;

export function isInvitationThemeKey(value: unknown): value is InvitationThemeKey {
  return (
    typeof value === 'string' &&
    INVITATION_THEME_KEYS.includes(value as InvitationThemeKey)
  );
}

export function normalizeInvitationThemeKey(
  value: unknown,
  fallback: InvitationThemeKey = DEFAULT_INVITATION_THEME
): InvitationThemeKey {
  return isInvitationThemeKey(value) ? value : fallback;
}

export function getInvitationThemeDefinition(theme: InvitationThemeKey) {
  return invitationThemeByKey[theme];
}

export function getInvitationThemeLabel(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).label;
}

export function getInvitationThemeAdminLabel(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).adminLabel;
}

export function getInvitationThemeWizardDescription(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).wizardDescription;
}

export function getInvitationThemePathSuffix(theme: InvitationThemeKey) {
  return getInvitationThemeDefinition(theme).pathSuffix;
}

export function buildInvitationThemeRoutePath(slug: string, theme: InvitationThemeKey) {
  const normalizedSlug = slug.trim().replace(/^\/+|\/+$/g, '');
  return `/${normalizedSlug}${getInvitationThemePathSuffix(theme)}`;
}
