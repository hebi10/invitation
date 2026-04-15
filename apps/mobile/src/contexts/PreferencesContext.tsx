import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { DEFAULT_API_BASE_URL, normalizeApiBaseUrl } from '../lib/api';
import { getStoredJson, setStoredJson } from '../lib/storage';
import {
  getFontScale,
  getPalette,
  resolveAppColorScheme,
  type FontScalePreference,
  type ThemePreference,
} from '../constants/theme';

const PREFERENCES_STORAGE_KEY = 'mobile-invitation:preferences';

type StoredPreferences = {
  apiBaseUrl: string;
  themePreference: ThemePreference;
  fontScalePreference: FontScalePreference;
};

const DEFAULT_PREFERENCES: StoredPreferences = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  themePreference: 'system',
  fontScalePreference: 'normal',
};

type PreferencesContextValue = {
  apiBaseUrl: string;
  themePreference: ThemePreference;
  fontScalePreference: FontScalePreference;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  isReady: boolean;
  setApiBaseUrl: (value: string) => Promise<void>;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  setFontScalePreference: (value: FontScalePreference) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_PREFERENCES.apiBaseUrl);
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>('system');
  const [fontScalePreference, setFontScalePreferenceState] =
    useState<FontScalePreference>('normal');
  const [isReady, setIsReady] = useState(false);
  const hasRestoredRef = useRef(false);

  const colorScheme = resolveAppColorScheme(systemColorScheme, themePreference);
  const palette = useMemo(() => getPalette(colorScheme), [colorScheme]);
  const fontScale = useMemo(
    () => getFontScale(fontScalePreference),
    [fontScalePreference]
  );

  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;
    let mounted = true;

    const restore = async () => {
      const stored = await getStoredJson<StoredPreferences>(
        PREFERENCES_STORAGE_KEY,
        DEFAULT_PREFERENCES
      );

      if (!mounted) {
        return;
      }

      setApiBaseUrlState(normalizeApiBaseUrl(stored.apiBaseUrl));
      setThemePreferenceState(stored.themePreference);
      setFontScalePreferenceState(stored.fontScalePreference);
      setIsReady(true);
    };

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  const persistPreferences = useCallback(
    async (next: StoredPreferences) => {
      setApiBaseUrlState(next.apiBaseUrl);
      setThemePreferenceState(next.themePreference);
      setFontScalePreferenceState(next.fontScalePreference);
      await setStoredJson(PREFERENCES_STORAGE_KEY, next);
    },
    []
  );

  const setApiBaseUrl = useCallback(
    async (value: string) => {
      await persistPreferences({
        apiBaseUrl: normalizeApiBaseUrl(value),
        themePreference,
        fontScalePreference,
      });
    },
    [fontScalePreference, persistPreferences, themePreference]
  );

  const setThemePreference = useCallback(
    async (value: ThemePreference) => {
      await persistPreferences({
        apiBaseUrl,
        themePreference: value,
        fontScalePreference,
      });
    },
    [apiBaseUrl, fontScalePreference, persistPreferences]
  );

  const setFontScalePreference = useCallback(
    async (value: FontScalePreference) => {
      await persistPreferences({
        apiBaseUrl,
        themePreference,
        fontScalePreference: value,
      });
    },
    [apiBaseUrl, persistPreferences, themePreference]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      apiBaseUrl,
      themePreference,
      fontScalePreference,
      palette,
      fontScale,
      isReady,
      setApiBaseUrl,
      setThemePreference,
      setFontScalePreference,
    }),
    [
      apiBaseUrl,
      fontScale,
      fontScalePreference,
      isReady,
      palette,
      setApiBaseUrl,
      setFontScalePreference,
      setThemePreference,
      themePreference,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider.');
  }
  return context;
}
