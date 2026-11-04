import type { ColorSchemeName } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type FontScalePreference = 'normal' | 'large';

export type AppPalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  cardBorder: string;
  inputBorder: string;
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
  background: '#faf8f5',
  surface: '#ffffff',
  surfaceMuted: '#f3eee9',
  cardBorder: '#e7dcd5',
  inputBorder: '#9f8c80',
  text: '#2b2828',
  textMuted: '#6c625e',
  accent: '#785847',
  accentSoft: '#f0e2da',
  notice: '#795a32',
  noticeSoft: '#f7f0de',
  danger: '#a5423a',
  dangerSoft: '#fbe8e5',
  success: '#2f694a',
  successSoft: '#e3f2e9',
};

const darkPalette: AppPalette = {
  background: '#181513',
  surface: '#211d1a',
  surfaceMuted: '#302822',
  cardBorder: '#51433c',
  inputBorder: '#a28e82',
  text: '#f9f6f2',
  textMuted: '#c8bfb8',
  accent: '#e7c6b5',
  accentSoft: '#49392f',
  notice: '#ebcb8b',
  noticeSoft: '#443923',
  danger: '#f2a8a4',
  dangerSoft: '#4a2928',
  success: '#9fd2b0',
  successSoft: '#203b2d',
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
