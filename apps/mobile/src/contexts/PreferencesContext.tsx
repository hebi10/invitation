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

import {
  DEFAULT_API_BASE_URL,
  normalizeApiBaseUrl,
  PRODUCTION_API_BASE_URL,
} from '../lib/api';
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

type PreferencesSettingsContextValue = {
  apiBaseUrl: string;
  themePreference: ThemePreference;
  fontScalePreference: FontScalePreference;
  isReady: boolean;
  setApiBaseUrl: (value: string) => Promise<void>;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  setFontScalePreference: (value: FontScalePreference) => Promise<void>;
};

type PreferencesVisualContextValue = {
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
};

type PreferencesContextValue = PreferencesSettingsContextValue & PreferencesVisualContextValue;

const PreferencesSettingsContext = createContext<PreferencesSettingsContextValue | null>(null);
const PreferencesVisualContext = createContext<PreferencesVisualContextValue | null>(null);

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

      const normalizedStoredApiBaseUrl = normalizeApiBaseUrl(stored.apiBaseUrl);
      const shouldResetStoredApiBaseUrl =
        normalizedStoredApiBaseUrl.startsWith('http://localhost:3000') ||
        normalizedStoredApiBaseUrl.startsWith('http://127.0.0.1:3000') ||
        normalizedStoredApiBaseUrl.startsWith('http://10.0.2.2:3000') ||
        normalizedStoredApiBaseUrl.startsWith('http://0.0.0.0:3000') ||
        /^http:\/\/\d{1,3}(?:\.\d{1,3}){3}:3000$/i.test(normalizedStoredApiBaseUrl);
      const resolvedApiBaseUrl = shouldResetStoredApiBaseUrl
        ? PRODUCTION_API_BASE_URL
        : normalizedStoredApiBaseUrl;

      setApiBaseUrlState(resolvedApiBaseUrl);
      setThemePreferenceState(stored.themePreference);
      setFontScalePreferenceState(stored.fontScalePreference);

      if (shouldResetStoredApiBaseUrl) {
        await setStoredJson(PREFERENCES_STORAGE_KEY, {
          ...stored,
          apiBaseUrl: PRODUCTION_API_BASE_URL,
        });
      }

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

  const settingsValue = useMemo<PreferencesSettingsContextValue>(
    () => ({
      apiBaseUrl,
      themePreference,
      fontScalePreference,
      isReady,
      setApiBaseUrl,
      setThemePreference,
      setFontScalePreference,
    }),
    [
      apiBaseUrl,
      fontScalePreference,
      isReady,
      setApiBaseUrl,
      setFontScalePreference,
      setThemePreference,
      themePreference,
    ]
  );

  const visualValue = useMemo<PreferencesVisualContextValue>(
    () => ({
      palette,
      fontScale,
    }),
    [fontScale, palette]
  );

  return (
    <PreferencesSettingsContext.Provider value={settingsValue}>
      <PreferencesVisualContext.Provider value={visualValue}>
        {children}
      </PreferencesVisualContext.Provider>
    </PreferencesSettingsContext.Provider>
  );
}

export function usePreferenceSettings() {
  const context = useContext(PreferencesSettingsContext);
  if (!context) {
    throw new Error('usePreferenceSettings must be used within PreferencesProvider.');
  }
  return context;
}

export function useVisualPreferences() {
  const context = useContext(PreferencesVisualContext);
  if (!context) {
    throw new Error('useVisualPreferences must be used within PreferencesProvider.');
  }
  return context;
}

export function usePreferences(): PreferencesContextValue {
  const settings = usePreferenceSettings();
  const visual = useVisualPreferences();

  return useMemo(
    () => ({
      ...settings,
      ...visual,
    }),
    [settings, visual]
  );
}
