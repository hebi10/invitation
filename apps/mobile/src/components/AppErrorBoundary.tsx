import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { getPalette } from '../constants/theme';
import { useOptionalVisualPreferences } from '../contexts/PreferencesContext';

type AppErrorBoundaryState = { hasError: boolean };

function ErrorFallback({ onRetry, onGoHome }: { onRetry: () => void; onGoHome: () => void }) {
  const systemScheme = useColorScheme();
  const appearance = useOptionalVisualPreferences();
  const palette = appearance?.palette ?? getPalette(systemScheme === 'dark' ? 'dark' : 'light');
  const fontScale = appearance?.fontScale ?? 1;

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: palette.text, fontSize: 22 * fontScale }]}
        >
          문제가 발생했습니다.
        </Text>
        <Text style={[styles.description, { color: palette.textMuted, fontSize: 15 * fontScale }]}>
          앱 화면을 표시하는 중 오류가 발생했습니다. 다시 시도하거나 홈으로 이동해 주세요.
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={[styles.button, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}
          >
            <Text style={[styles.buttonText, { color: palette.text, fontSize: 15 * fontScale }]}>
              다시 시도
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onGoHome}
            style={[styles.button, { backgroundColor: palette.accent, borderColor: palette.accent }]}
          >
            <Text style={[styles.buttonText, { color: palette.surface, fontSize: 15 * fontScale }]}>
              홈으로 이동
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export class AppErrorBoundary extends React.Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[mobile] uncaught app error', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false }, () => {
      router.replace('/');
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback onRetry={this.handleRetry} onGoHome={this.handleGoHome} />;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  card: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 0, padding: 20, gap: 14 },
  title: { fontWeight: '600' },
  description: { lineHeight: 24 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  buttonText: { fontWeight: '600', textAlign: 'center' },
});
