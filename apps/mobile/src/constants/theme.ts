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
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
};

const lightPalette: AppPalette = {
  background: '#f7f4ee',
  surface: '#ffffff',
  surfaceMuted: '#f3ede2',
  cardBorder: '#e4dacc',
  text: '#1f1b16',
  textMuted: '#6d6256',
  accent: '#9a5f3d',
  accentSoft: '#f3e1d4',
  danger: '#b64b4b',
  dangerSoft: '#f6dddd',
  success: '#2f7d4c',
  successSoft: '#dff3e6',
};

const darkPalette: AppPalette = {
  background: '#141210',
  surface: '#1f1a16',
  surfaceMuted: '#2b241f',
  cardBorder: '#40362d',
  text: '#f6efe6',
  textMuted: '#c8b8a6',
  accent: '#f0a06a',
  accentSoft: '#3a281d',
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
