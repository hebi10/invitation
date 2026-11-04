import type { PropsWithChildren } from 'react';

import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useVisualPreferences } from '../contexts/PreferencesContext';

export type AppTextVariant = 'body' | 'title' | 'display' | 'caption' | 'muted';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: AppTextVariant;
    color?: string;
    style?: StyleProp<TextStyle>;
  }
>;

const VARIANT_STYLES: Record<AppTextVariant, TextStyle> = {
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  title: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '600',
  },
  display: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  muted: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
};

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  ...textProps
}: AppTextProps) {
  const { palette, fontScale } = useVisualPreferences();
  const variantStyle = VARIANT_STYLES[variant];
  const resolvedColor =
    color ?? (variant === 'muted' ? palette.textMuted : palette.text);

  return (
    <Text
      {...textProps}
      style={[
        styles.base,
        {
          color: resolvedColor,
          fontSize:
            typeof variantStyle.fontSize === 'number'
              ? variantStyle.fontSize * fontScale
              : variantStyle.fontSize,
          lineHeight:
            typeof variantStyle.lineHeight === 'number'
              ? variantStyle.lineHeight * fontScale
              : variantStyle.lineHeight,
          fontWeight: variantStyle.fontWeight,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {},
});
