import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import type { AppPalette } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_CONTROL_MIN_HEIGHT,
  APP_SPACING,
  getScaledTypography,
} from '../constants/uiTokens';

type StatusAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

type AppStatusScreenProps = {
  palette: AppPalette;
  fontScale: number;
  title: string;
  description: string;
  statusLabel: string;
  actions: readonly StatusAction[];
};

export function AppStatusScreen({
  palette,
  fontScale,
  title,
  description,
  statusLabel,
  actions,
}: AppStatusScreenProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topPadding = insets.top + Math.min(120, Math.max(32, height * 0.1));

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + APP_SPACING.xl }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.cardBorder },
        ]}
      >
        <Text
          style={[
            { color: palette.textMuted },
            getScaledTypography('caption', fontScale),
          ]}
        >
          {statusLabel}
        </Text>
        <Text
          accessibilityRole="header"
          style={[{ color: palette.text }, getScaledTypography('title', fontScale)]}
        >
          {title}
        </Text>
        <Text
          style={[
            { color: palette.textMuted },
            getScaledTypography('body', fontScale),
          ]}
        >
          {description}
        </Text>
        <View style={styles.actions}>
          {actions.map((action) => {
            const primary = action.variant === 'primary';

            return (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: primary ? palette.accent : palette.surface,
                    borderColor: primary ? palette.accent : palette.cardBorder,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    { color: primary ? palette.surface : palette.accent, textAlign: 'center' },
                    getScaledTypography('button', fontScale),
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: APP_SPACING.md,
    gap: APP_SPACING.md,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 0,
    padding: APP_SPACING.lg,
    gap: APP_SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: APP_SPACING.xs,
    marginTop: APP_SPACING.xs,
  },
  action: {
    flexGrow: 1,
    flexBasis: 132,
    minWidth: 120,
    minHeight: APP_CONTROL_MIN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: APP_SPACING.sm,
    paddingVertical: APP_SPACING.sm,
  },
});
