import type { TextStyle } from 'react-native';

export const APP_SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const APP_CONTROL_MIN_HEIGHT = 48;

export const APP_TYPOGRAPHY = {
  screenTitle: { fontSize: 25, lineHeight: 34, fontWeight: '700' },
  screenSubtitle: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  display: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  title: { fontSize: 19, lineHeight: 27, fontWeight: '600' },
  heroTitle: { fontSize: 21, lineHeight: 29, fontWeight: '600' },
  cardTitle: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  cardDescription: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  body: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  muted: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  button: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  chip: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
  badge: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
} as const;

export type AppTypographyRole = keyof typeof APP_TYPOGRAPHY;

export function getScaledTypography(role: AppTypographyRole, fontScale: number): TextStyle {
  const token = APP_TYPOGRAPHY[role];

  return {
    fontSize: token.fontSize * fontScale,
    lineHeight: token.lineHeight * fontScale,
    fontWeight: token.fontWeight,
  };
}
