import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';

import { useAppFeedback } from '../contexts/AppFeedbackContext';
import { INVITATION_THEME_KEYS } from '../lib/invitationThemes';

const APP_LINK_SCHEME = 'mobileinvitation';
const APP_LINK_WEB_HOSTS = new Set(['msgnote.kr', 'www.msgnote.kr']);
const APP_LINK_WEB_PREFIXES = new Set(['app', 'mobile']);
const VALID_TICKET_INTENTS = new Set(['extend', 'extra-page', 'extra-variant', 'upgrade']);
const VALID_PRODUCT_TIERS = new Set(['standard', 'deluxe', 'premium']);
const VALID_THEME_KEYS = new Set(INVITATION_THEME_KEYS);

type AppDeepLinkResolution =
  | {
      type: 'ignore';
    }
  | {
      type: 'unsupported';
    }
  | {
      type: 'route';
      href: Href;
    };

function getNormalizedSegments(url: URL) {
  const basePathSegments = url.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const protocol = url.protocol.replace(':', '').toLowerCase();
  const hostname = url.hostname.trim().toLowerCase();

  if (protocol === APP_LINK_SCHEME) {
    return hostname ? [hostname, ...basePathSegments] : basePathSegments;
  }

  if (!['http', 'https'].includes(protocol) || !APP_LINK_WEB_HOSTS.has(hostname)) {
    return null;
  }

  if (!basePathSegments.length || !APP_LINK_WEB_PREFIXES.has(basePathSegments[0])) {
    return null;
  }

  return basePathSegments.slice(1);
}

function buildCreateHref(searchParams: URLSearchParams): Href {
  const params: Record<string, string> = {};
  const draftId = searchParams.get('draftId')?.trim();
  const ticketIntent = searchParams.get('ticketIntent')?.trim();
  const targetPlan = searchParams.get('targetPlan')?.trim();
  const targetTheme = searchParams.get('targetTheme')?.trim();

  if (draftId) {
    params.draftId = draftId;
  }
  if (ticketIntent && VALID_TICKET_INTENTS.has(ticketIntent)) {
    params.ticketIntent = ticketIntent;
  }
  if (targetPlan && VALID_PRODUCT_TIERS.has(targetPlan)) {
    params.targetPlan = targetPlan;
  }
  if (targetTheme && VALID_THEME_KEYS.has(targetTheme)) {
    params.targetTheme = targetTheme;
  }

  if (Object.keys(params).length === 0) {
    return '/create';
  }

  return {
    pathname: '/create',
    params,
  } as Href;
}

function buildLoginHref(searchParams: URLSearchParams): Href {
  const next = searchParams.get('next')?.trim();

  if (!next || !next.startsWith('/')) {
    return '/login';
  }

  return {
    pathname: '/login',
    params: {
      next,
    },
  } as Href;
}

function resolveAppDeepLink(urlString: string): AppDeepLinkResolution {
  try {
    const url = new URL(urlString);
    const segments = getNormalizedSegments(url);

    if (segments === null) {
      return { type: 'ignore' };
    }

    const routeKey = (segments[0] ?? '').toLowerCase();

    if (routeKey === '' || routeKey === 'index' || routeKey === 'home') {
      return { type: 'route', href: '/' };
    }

    if (routeKey === 'guide') {
      return { type: 'route', href: '/guide' };
    }

    if (routeKey === 'create') {
      return { type: 'route', href: buildCreateHref(url.searchParams) };
    }

    if (routeKey === 'manage') {
      return { type: 'route', href: '/manage' };
    }

    if (routeKey === 'settings') {
      return { type: 'route', href: '/settings' };
    }

    if (routeKey === 'login') {
      return { type: 'route', href: buildLoginHref(url.searchParams) };
    }

    return { type: 'unsupported' };
  } catch {
    return { type: 'ignore' };
  }
}

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
