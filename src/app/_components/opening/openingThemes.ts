import { resolveAvailableInvitationVariant } from '@/lib/invitationVariants';
import type { InvitationPage } from '@/types/invitationPage';

export const OPENING_THEME_KEYS = ['opening-natural', 'opening-modern'] as const;

export type OpeningThemeKey = (typeof OPENING_THEME_KEYS)[number];

export type OpeningVisualTheme = {
  key: OpeningThemeKey;
  label: string;
  shortLabel: string;
  background: string;
  surface: string;
  mutedSurface: string;
  text: string;
  subText: string;
  accent: string;
  accentText: string;
  border: string;
  heroBackground: string;
  introBackground: string;
  badgeBackground: string;
  titleFont: string;
  bodyFont: string;
};

export const DEFAULT_OPENING_THEME: OpeningThemeKey = 'opening-natural';

export const OPENING_THEMES: Record<OpeningThemeKey, OpeningVisualTheme> = {
  'opening-natural': {
    key: 'opening-natural',
    label: '따뜻한 내추럴',
    shortLabel: 'Natural',
    background: '#faf7f2',
    surface: '#fffdf8',
    mutedSurface: '#f2eadf',
    text: '#2c2416',
    subText: '#786b5b',
    accent: '#8b6a3e',
    accentText: '#fff9f0',
    border: '#e4d9ca',
    heroBackground: '#2d3a2e',
    introBackground: '#2d3a2e',
    badgeBackground: '#4a6741',
    titleFont: '"Times New Roman", "Noto Serif KR", serif',
    bodyFont: 'Arial, "Noto Sans KR", sans-serif',
  },
  'opening-modern': {
    key: 'opening-modern',
    label: '모던 브랜디드',
    shortLabel: 'Modern',
    background: '#0f0f0f',
    surface: '#1b1b1b',
    mutedSurface: '#242424',
    text: '#f0ede8',
    subText: '#aaa39b',
    accent: '#c9a96e',
    accentText: '#111111',
    border: '#303030',
    heroBackground: '#0f0f0f',
    introBackground: '#0f0f0f',
    badgeBackground: '#c9a96e',
    titleFont: 'Georgia, "Times New Roman", serif',
    bodyFont: 'Arial, "Noto Sans KR", sans-serif',
  },
};

export function isOpeningThemeKey(value: unknown): value is OpeningThemeKey {
  return (
    typeof value === 'string' &&
    OPENING_THEME_KEYS.includes(value as OpeningThemeKey)
  );
}

export function normalizeOpeningThemeKey(
  value: unknown,
  fallback: OpeningThemeKey = DEFAULT_OPENING_THEME
): OpeningThemeKey {
  return isOpeningThemeKey(value) ? value : fallback;
}

export function getOpeningTheme(theme: OpeningThemeKey) {
  return OPENING_THEMES[theme];
}

export function resolveOpeningRouteTheme(
  previewPage: InvitationPage | null | undefined,
  requestedTheme?: string | null,
  defaultTheme?: string | null
) {
  if (!previewPage) {
    return null;
  }

  const preferred = normalizeOpeningThemeKey(
    requestedTheme ?? defaultTheme,
    DEFAULT_OPENING_THEME
  );

  const resolved = resolveAvailableInvitationVariant(previewPage.variants, preferred);
  return isOpeningThemeKey(resolved) ? resolved : preferred;
}
