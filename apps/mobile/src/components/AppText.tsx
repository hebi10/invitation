import type { PropsWithChildren } from 'react';

import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { getScaledTypography } from '../constants/uiTokens';
import { useVisualPreferences } from '../contexts/PreferencesContext';

export type AppTextVariant = 'body' | 'title' | 'display' | 'cardTitle' | 'caption' | 'muted';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: AppTextVariant;
    color?: string;
    style?: StyleProp<TextStyle>;
  }
>;

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  ...textProps
}: AppTextProps) {
  const { palette, fontScale } = useVisualPreferences();
  const resolvedColor =
    color ?? (variant === 'muted' ? palette.textMuted : palette.text);

  return (
    <Text
      {...textProps}
      style={[
        { color: resolvedColor },
        getScaledTypography(variant, fontScale),
        style,
      ]}
    >
      {children}
    </Text>
  );
}

