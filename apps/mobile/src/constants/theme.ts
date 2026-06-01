import type { ColorSchemeName } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type FontScalePreference = 'normal' | 'large';

export type AppPalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  notice: string;
  noticeSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
};

const lightPalette: AppPalette = {
  background: '#f7f6f2',
  surface: '#ffffff',
  surfaceMuted: '#eef2f4',
  cardBorder: '#dde2e3',
  text: '#1c2021',
  textMuted: '#626b6d',
  accent: '#2f6f73',
  accentSoft: '#dff0ef',
  notice: '#7a6130',
  noticeSoft: '#f4edda',
  danger: '#b64b4b',
  dangerSoft: '#f6dddd',
  success: '#2f7d4c',
  successSoft: '#dff3e6',
};

const darkPalette: AppPalette = {
  background: '#111416',
  surface: '#1b2022',
  surfaceMuted: '#242b2e',
  cardBorder: '#374145',
  text: '#f3f5f4',
  textMuted: '#bdc7c8',
  accent: '#8fcfd0',
  accentSoft: '#183336',
  notice: '#f0d37a',
  noticeSoft: '#40351a',
  danger: '#ef8d8d',
  dangerSoft: '#432525',
  success: '#77c48f',
  successSoft: '#1f3427',
};

export function resolveAppColorScheme(
  systemColorScheme: ColorSchemeName,
  preference: ThemePreference
) {
  if (preference === 'system') {
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}

export function getPalette(colorScheme: 'light' | 'dark'): AppPalette {
  return colorScheme === 'dark' ? darkPalette : lightPalette;
}

export function getFontScale(preference: FontScalePreference) {
  return preference === 'large' ? 1.12 : 1;
}
