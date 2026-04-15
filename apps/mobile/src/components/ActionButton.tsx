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
}>;

export function ActionButton({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ActionButtonProps) {
  const { palette, fontScale } = useAppState();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary'
      ? palette.accent
      : variant === 'danger'
        ? palette.danger
        : palette.surfaceMuted;
  const textColor =
    variant === 'primary' || variant === 'danger' ? '#ffffff' : palette.text;
  const borderColor =
    variant === 'primary'
      ? palette.accent
      : variant === 'danger'
        ? palette.danger
        : palette.cardBorder;

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
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={textColor} size="small" /> : null}
        <Text style={[styles.label, { color: textColor, fontSize: 14 * fontScale }]}>
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
    backgroundColor: '#ffffff',
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
    color: '#000000',
  },
});
