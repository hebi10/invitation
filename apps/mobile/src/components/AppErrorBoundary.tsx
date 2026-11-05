import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { useColorScheme } from 'react-native';

import { getPalette } from '../constants/theme';
import { useOptionalVisualPreferences } from '../contexts/PreferencesContext';
import { AppStatusScreen } from './AppStatusScreen';

type AppErrorBoundaryState = { hasError: boolean };

export function ErrorFallback({ onRetry, onGoHome }: { onRetry: () => void; onGoHome: () => void }) {
  const systemScheme = useColorScheme();
  const appearance = useOptionalVisualPreferences();
  const palette = appearance?.palette ?? getPalette(systemScheme === 'dark' ? 'dark' : 'light');
  const fontScale = appearance?.fontScale ?? 1;

  return (
    <AppStatusScreen
      palette={palette}
      fontScale={fontScale}
      statusLabel="화면 오류"
      title="문제가 발생했습니다"
      description="앱 화면을 표시하는 중 문제가 발생했습니다. 다시 시도하거나 홈으로 이동해 주세요."
      actions={[
        { label: '다시 시도', onPress: onRetry },
        { label: '홈으로 이동', onPress: onGoHome, variant: 'primary' },
      ]}
    />
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
