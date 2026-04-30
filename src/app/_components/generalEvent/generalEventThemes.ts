export const GENERAL_EVENT_THEME_KEYS = [
  'general-event-elegant',
  'general-event-vivid',
] as const;

export type GeneralEventThemeKey = (typeof GENERAL_EVENT_THEME_KEYS)[number];

export type GeneralEventVisualTheme = {
  key: GeneralEventThemeKey;
  label: string;
  shortLabel: string;
  accent: string;
  accentText: string;
  background: string;
  surface: string;
  mutedSurface: string;
  text: string;
  subText: string;
  border: string;
  heroBackground: string;
  introBackground: string;
  titleFont: string;
  bodyFont: string;
  isVivid: boolean;
};

export const GENERAL_EVENT_DEFAULT_THEME: GeneralEventThemeKey = 'general-event-elegant';

export const GENERAL_EVENT_THEMES: Record<GeneralEventThemeKey, GeneralEventVisualTheme> = {
  'general-event-elegant': {
    key: 'general-event-elegant',
    label: '모던 & 엘레강스',
    shortLabel: 'Elegant',
    accent: '#c9a96e',
    accentText: '#0b0b16',
    background: '#0b0b16',
    surface: 'rgba(255,255,255,0.055)',
    mutedSurface: 'rgba(255,255,255,0.035)',
    text: '#f5f0e8',
    subText: 'rgba(245,240,232,0.66)',
    border: 'rgba(201,169,110,0.24)',
    heroBackground:
      'radial-gradient(ellipse at 50% 28%, rgba(201,169,110,0.22) 0%, transparent 62%), #0b0b16',
    introBackground: '#0b0b16',
    titleFont: '"Times New Roman", Georgia, serif',
    bodyFont: 'Arial, sans-serif',
    isVivid: false,
  },
  'general-event-vivid': {
    key: 'general-event-vivid',
    label: '파티 & 비비드',
    shortLabel: 'Vivid',
    accent: '#ff4db8',
    accentText: '#ffffff',
    background: '#12003a',
    surface: 'rgba(255,255,255,0.07)',
    mutedSurface: 'rgba(255,255,255,0.045)',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.72)',
    border: 'rgba(255,77,184,0.34)',
    heroBackground:
      'radial-gradient(ellipse at 30% 20%, #5c00d4 0%, transparent 55%), radial-gradient(ellipse at 72% 62%, #d4006e 0%, transparent 55%), #12003a',
    introBackground: 'linear-gradient(135deg, #1a0050 0%, #3d0080 52%, #1a0050 100%)',
    titleFont: 'Arial, sans-serif',
    bodyFont: 'Arial, sans-serif',
    isVivid: true,
  },
};

export function isGeneralEventThemeKey(value: unknown): value is GeneralEventThemeKey {
  return (
    typeof value === 'string' &&
    GENERAL_EVENT_THEME_KEYS.includes(value as GeneralEventThemeKey)
  );
}

export function normalizeGeneralEventThemeKey(
  value: unknown,
  fallback: GeneralEventThemeKey = GENERAL_EVENT_DEFAULT_THEME
): GeneralEventThemeKey {
  return isGeneralEventThemeKey(value) ? value : fallback;
}

export function getGeneralEventTheme(theme: GeneralEventThemeKey) {
  return GENERAL_EVENT_THEMES[theme];
}
