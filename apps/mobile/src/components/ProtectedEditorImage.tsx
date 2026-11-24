import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { fetch as expoFetch } from 'expo/fetch';
import type { ImageStyle, StyleProp } from 'react-native';
import { View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { getOrCreateMobileDeviceId } from '../lib/storage';
import { buildNativeEditorMediaTarget, readNativeEditorMedia } from '../lib/nativeEditorMedia';
import type { MobileSessionSummary } from '../types/mobileInvitation';
import { AppText } from './AppText';

type LoadedImage = { uri: string; session: MobileSessionSummary; baseUrl: string; dataUri: string; failed: boolean };

export function ProtectedEditorImage({ uri, alt, style, fit = 'cover' }: {
  uri: string; alt: string; style: StyleProp<ImageStyle>; fit?: 'cover' | 'contain';
}) {
  const { session } = useAuth();
  const { apiBaseUrl } = usePreferences();
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const target = session ? buildNativeEditorMediaTarget(uri, session.pageSlug, apiBaseUrl, __DEV__) : null;
  const current = loaded?.uri === uri && loaded.session === session && loaded.baseUrl === apiBaseUrl ? loaded : null;

  useEffect(() => {
    setLoaded(null);
    if (!session || !target) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    void (async () => {
      try {
        const deviceId = await getOrCreateMobileDeviceId();
        const dataUri = await readNativeEditorMedia({
          reference: uri, slug: session.pageSlug, baseUrl: apiBaseUrl, allowLocal: __DEV__,
          token: session.token, deviceId, signal: controller.signal,
        }, (url, init) => expoFetch(url, init));
        if (active) setLoaded({ uri, session, baseUrl: apiBaseUrl, dataUri, failed: false });
      } catch {
        if (active) setLoaded({ uri, session, baseUrl: apiBaseUrl, dataUri: '', failed: true });
      } finally { clearTimeout(timer); }
    })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [uri, session, apiBaseUrl, target]);

  if (current?.dataUri && !current.failed) {
    return <Image source={{ uri: current.dataUri }} alt={alt} accessibilityLabel={alt} style={style}
      contentFit={fit} cachePolicy="none" onError={() => setLoaded(value => value === current ? { ...value, dataUri: '', failed: true } : value)} />;
  }
  return <View style={style}><AppText variant="muted" accessibilityLiveRegion="polite">
    {!target || current?.failed ? '사진 접근 권한 또는 네트워크를 확인해 주세요.' : '사진 불러오는 중…'}
  </AppText></View>;
}
