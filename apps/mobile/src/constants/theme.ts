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
  background: '#f8f8f7',
  surface: '#ffffff',
  surfaceMuted: '#f0f1ee',
  cardBorder: '#d8dad4',
  text: '#1c1d1a',
  textMuted: '#666862',
  accent: '#292b27',
  accentSoft: '#e9ebe6',
  notice: '#7a6130',
  noticeSoft: '#f4edda',
  danger: '#a5423a',
  dangerSoft: '#f6dddd',
  success: '#3f7054',
  successSoft: '#dff3e6',
};

const darkPalette: AppPalette = {
  background: '#141513',
  surface: '#1e201c',
  surfaceMuted: '#282b25',
  cardBorder: '#44483f',
  text: '#f3f4f0',
  textMuted: '#b9bdb3',
  accent: '#e3e7dc',
  accentSoft: '#30362c',
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
