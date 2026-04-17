import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
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
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>문제가 발생했습니다.</Text>
          <Text style={styles.description}>
            앱 화면을 표시하는 중 오류가 발생했습니다. 다시 시도하거나 홈으로
            이동해 주세요.
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={this.handleRetry}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                다시 시도
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={this.handleGoHome}
              style={[styles.button, styles.primaryButton]}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                홈으로 이동
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f4ee',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e4dacc',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 14,
  },
  title: {
    color: '#1f1b16',
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    color: '#6d6256',
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#9a5f3d',
    borderColor: '#9a5f3d',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d9c7b7',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#6d6256',
  },
});
