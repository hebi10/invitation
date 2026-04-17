import type { PropsWithChildren } from 'react';
import {
  Platform,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../components/AppText';
import { normalizeApiBaseUrl } from '../lib/api';

import { usePreferences } from './PreferencesContext';

export type AppToastTone = 'success' | 'error' | 'notice' | 'neutral';

type AppToastState = {
  id: number;
  message: string;
  tone: AppToastTone;
};

type AppFeedbackContextValue = {
  showToast: (
    message: string,
    options?: {
      tone?: AppToastTone;
      durationMs?: number;
    }
  ) => void;
  dismissToast: () => void;
  isOffline: boolean;
  refreshConnectivity: () => Promise<void>;
};

const DEFAULT_TOAST_DURATION_MS = 2800;
const CONNECTIVITY_POLL_INTERVAL_MS = 30000;
const SUCCESS_VIBRATION_DURATION_MS = 12;
const AppFeedbackContext = createContext<AppFeedbackContextValue | null>(null);

export function AppFeedbackProvider({ children }: PropsWithChildren) {
  const { apiBaseUrl, palette } = usePreferences();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<AppToastState | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (
      message: string,
      options: {
        tone?: AppToastTone;
        durationMs?: number;
      } = {}
    ) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        return;
      }

      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }

      const tone = options.tone ?? 'neutral';
      const nextToast = {
        id: Date.now(),
        message: trimmedMessage,
        tone,
      } satisfies AppToastState;

      setToast(nextToast);

      if (tone === 'success' && Platform.OS !== 'web') {
        Vibration.vibrate(SUCCESS_VIBRATION_DURATION_MS);
      }

      dismissTimeoutRef.current = setTimeout(() => {
        setToast((current) => (current?.id === nextToast.id ? null : current));
        dismissTimeoutRef.current = null;
      }, options.durationMs ?? DEFAULT_TOAST_DURATION_MS);
    },
    []
  );

  const refreshConnectivity = useCallback(async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOffline(true);
      return;
    }

    try {
      const response = await fetch(
        `${normalizeApiBaseUrl(apiBaseUrl)}/api/mobile/client-editor/music-library`,
        {
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      setIsOffline(!response.ok && response.status >= 500);
    } catch {
      setIsOffline(true);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void refreshConnectivity();

    const interval = setInterval(() => {
      void refreshConnectivity();
    }, CONNECTIVITY_POLL_INTERVAL_MS);

    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return () => {
        clearInterval(interval);
      };
    }

    const handleOnline = () => {
      setIsOffline(false);
      void refreshConnectivity();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshConnectivity]);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const toastStyle = useMemo(() => {
    if (!toast) {
      return null;
    }

    if (toast.tone === 'success') {
      return {
        backgroundColor: palette.successSoft,
        borderColor: palette.success,
        textColor: palette.success,
      };
    }

    if (toast.tone === 'error') {
      return {
        backgroundColor: palette.dangerSoft,
        borderColor: palette.danger,
        textColor: palette.danger,
      };
    }

    if (toast.tone === 'notice') {
      return {
        backgroundColor: palette.noticeSoft,
        borderColor: palette.notice,
        textColor: palette.notice,
      };
    }

    return {
      backgroundColor: palette.surface,
      borderColor: palette.cardBorder,
      textColor: palette.text,
    };
  }, [palette.cardBorder, palette.danger, palette.dangerSoft, palette.notice, palette.noticeSoft, palette.success, palette.successSoft, palette.surface, palette.text, toast]);

  const value = useMemo<AppFeedbackContextValue>(
    () => ({
      showToast,
      dismissToast,
      isOffline,
      refreshConnectivity,
    }),
    [dismissToast, isOffline, refreshConnectivity, showToast]
  );

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.overlay}>
        {isOffline ? (
          <View
            style={[
              styles.offlineBanner,
              {
                top: insets.top + 12,
                backgroundColor: palette.dangerSoft,
                borderColor: palette.danger,
              },
            ]}
          >
            <AppText color={palette.danger} style={styles.bannerText}>
              오프라인 상태입니다. 연결이 복구되면 다시 시도해 주세요.
            </AppText>
          </View>
        ) : null}

        {toast && toastStyle ? (
          <View
            style={[
              styles.toast,
              {
                bottom: insets.bottom + 84,
                backgroundColor: toastStyle.backgroundColor,
                borderColor: toastStyle.borderColor,
              },
            ]}
          >
            <AppText color={toastStyle.textColor} style={styles.toastText}>
              {toast.message}
            </AppText>
          </View>
        ) : null}
      </View>
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);
  if (!context) {
    throw new Error('useAppFeedback must be used within AppFeedbackProvider.');
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  offlineBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: {
    lineHeight: 20,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  toastText: {
    lineHeight: 20,
    fontWeight: '700',
  },
});
