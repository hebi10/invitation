import type { PropsWithChildren } from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import { useAppState } from '../contexts/AppStateContext';

type ActionButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  labelColor?: string;
}>;

export function ActionButton({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  backgroundColor,
  borderColor,
  labelColor,
}: ActionButtonProps) {
  const { palette, fontScale } = useAppState();
  const isDisabled = disabled || loading;

  const defaultBackgroundColor =
    variant === 'primary'
      ? palette.accent
      : variant === 'danger'
        ? palette.danger
        : palette.accentSoft;
  const defaultTextColor =
    variant === 'primary' || variant === 'danger' ? palette.surface : palette.accent;
  const defaultBorderColor =
    variant === 'primary'
      ? palette.accent
      : variant === 'danger'
        ? palette.danger
        : palette.accent;
  const resolvedBackgroundColor = backgroundColor ?? defaultBackgroundColor;
  const resolvedBorderColor = borderColor ?? defaultBorderColor;
  const resolvedTextColor = labelColor ?? defaultTextColor;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        fullWidth ? styles.fullWidth : null,
        style,
        {
          backgroundColor: resolvedBackgroundColor,
          borderColor: resolvedBorderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={resolvedTextColor} size="small" /> : null}
        <Text style={[styles.label, { color: resolvedTextColor, fontSize: 14 * fontScale }]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '700',
  },
});
