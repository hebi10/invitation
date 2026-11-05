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
  background: '#f8f8f7',
  surface: '#ffffff',
  surfaceMuted: '#f1f2ef',
  cardBorder: '#d8dad4',
  inputBorder: '#8c9087',
  text: '#1c1d1a',
  textMuted: '#666862',
  accent: '#292b27',
  accentSoft: '#eceee9',
  notice: '#8a6428',
  noticeSoft: '#f8f1e5',
  danger: '#a5423a',
  dangerSoft: '#fbe8e5',
  success: '#3f7054',
  successSoft: '#e8f3eb',
};

const darkPalette: AppPalette = {
  background: '#151815',
  surface: '#202420',
  surfaceMuted: '#2c322c',
  cardBorder: '#505950',
  inputBorder: '#89948a',
  text: '#f5f7f2',
  textMuted: '#bbc5b9',
  accent: '#d9e4d9',
  accentSoft: '#374339',
  notice: '#eecb83',
  noticeSoft: '#463923',
  danger: '#f2aaa5',
  dangerSoft: '#4a2a28',
  success: '#a9dcb9',
  successSoft: '#254032',
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
