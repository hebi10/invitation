import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';

import { useAppFeedback } from '../contexts/AppFeedbackContext';
import { resolveAppDeepLink } from '../lib/appDeepLink';

export function useAppDeepLinkHandler() {
  const router = useRouter();
  const { showToast } = useAppFeedback();
  const lastHandledUrlRef = useRef<string | null>(null);

  const handleAppDeepLink = useCallback(
    (url: string, mode: 'replace' | 'push') => {
      const normalizedUrl = url.trim();
      if (!normalizedUrl || lastHandledUrlRef.current === normalizedUrl) {
        return;
      }

      const resolution = resolveAppDeepLink(normalizedUrl);
      if (resolution.type === 'ignore') {
        return;
      }

      lastHandledUrlRef.current = normalizedUrl;

      if (resolution.type === 'unsupported') {
        showToast('지원하지 않는 앱 링크입니다.', { tone: 'notice' });
        return;
      }

      if (mode === 'replace') {
        router.replace(resolution.href);
        return;
      }

      router.push(resolution.href);
    },
    [router, showToast]
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void Linking.getInitialURL().then((initialUrl) => {
      if (!initialUrl) {
        return;
      }

      handleAppDeepLink(initialUrl, 'replace');
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAppDeepLink(url, 'push');
    });

    return () => {
      subscription.remove();
    };
  }, [handleAppDeepLink]);
}
