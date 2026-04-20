import type {
  MobileDisplayPeriodSummary,
  MobileInvitationFeatureFlags,
  MobileInvitationLinks,
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
  MobilePageSummary,
  MobileInvitationSeed,
  MobileSessionSummary,
} from '../types/mobileInvitation';
import {
  DEFAULT_INVITATION_THEME,
  INVITATION_THEME_KEYS,
  isInvitationThemeKey,
} from './invitationThemes';

export type LinkedInvitationTheme = {
  key: MobileInvitationThemeKey;
  previewUrl: string | null;
};

export type LinkedInvitationCard = {
  slug: string;
  displayName: string;
  productTier: MobileInvitationProductTier;
  defaultTheme: MobileInvitationThemeKey;
  published: boolean;
  showMusic: boolean;
  showGuestbook: boolean;
  publicUrl: string | null;
  linkedThemes: LinkedInvitationTheme[];
  displayPeriod: MobileDisplayPeriodSummary;
  updatedAt: number;
  ticketCount: number;
  session: MobileSessionSummary | null;
  hasResolvedLinkedThemes: boolean;
};

type LinkedInvitationTokenMap = Record<string, string>;

export const LINKED_INVITATION_CARDS_STORAGE_KEY =
  'mobile-invitation:linked-invitation-cards';
export const MAX_LINKED_INVITATION_CARD_COUNT = 8;
const LINKED_INVITATION_SESSION_EXPIRY_BUFFER_MS = 30 * 1000;

function normalizePreviewUrl(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function coerceFeatureFlag(features: unknown, key: keyof MobileInvitationFeatureFlags) {
  return Boolean(
    features &&
      typeof features === 'object' &&
      key in features &&
      (features as Record<string, unknown>)[key]
  );
}

function buildPreviewUrlMap(
  input: unknown
): Partial<Record<MobileInvitationThemeKey, string>> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return INVITATION_THEME_KEYS.reduce<Partial<Record<MobileInvitationThemeKey, string>>>(
    (accumulator, key) => {
      const value = normalizePreviewUrl((input as Record<string, unknown>)[key]);
      if (value) {
        accumulator[key] = value;
      }
      return accumulator;
    },
    {}
  );
}

function orderLinkedThemes(
  themes: LinkedInvitationTheme[],
  defaultTheme: MobileInvitationThemeKey,
  options: { ensureDefaultTheme?: boolean } = {}
) {
  const themeMap = themes.reduce<Map<MobileInvitationThemeKey, LinkedInvitationTheme>>(
    (accumulator, theme) => {
      const existing = accumulator.get(theme.key);
      if (!existing || (!existing.previewUrl && theme.previewUrl)) {
        accumulator.set(theme.key, theme);
      }
      return accumulator;
    },
    new Map()
  );

  if (options.ensureDefaultTheme) {
    themeMap.set(defaultTheme, themeMap.get(defaultTheme) ?? {
      key: defaultTheme,
      previewUrl: null,
    });
  }

  const orderedKeys = [defaultTheme, ...INVITATION_THEME_KEYS.filter((key) => key !== defaultTheme)];
  return orderedKeys
    .filter((key) => themeMap.has(key))
    .map((key) => themeMap.get(key) as LinkedInvitationTheme);
}

function normalizeStoredLinkedTheme(input: unknown): LinkedInvitationTheme | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Record<string, unknown>;
  if (!isInvitationThemeKey(record.key)) {
    return null;
  }

  return {
    key: record.key,
    previewUrl: normalizePreviewUrl(record.previewUrl),
  };
}

function normalizeStoredLinkedThemes(
  record: Record<string, unknown>,
  defaultTheme: MobileInvitationThemeKey
) {
  const storedLinkedThemes = Array.isArray(record.linkedThemes)
    ? record.linkedThemes
        .map((item) => normalizeStoredLinkedTheme(item))
        .filter((item): item is LinkedInvitationTheme => item !== null)
    : [];

  if (storedLinkedThemes.length > 0) {
    return {
      linkedThemes: orderLinkedThemes(storedLinkedThemes, defaultTheme, {
        ensureDefaultTheme: true,
      }),
      hasResolvedLinkedThemes: true,
    };
  }

  const legacyAvailableThemeKeys = Array.isArray(record.availableThemeKeys)
    ? record.availableThemeKeys.filter(isInvitationThemeKey)
    : [];
  const legacyPreviewUrlMap = buildPreviewUrlMap(record.previewUrls);

  if (legacyAvailableThemeKeys.length === 0) {
    return {
      linkedThemes: orderLinkedThemes(
        [
          {
            key: defaultTheme,
            previewUrl: legacyPreviewUrlMap[defaultTheme] ?? null,
          },
        ],
        defaultTheme,
        {
          ensureDefaultTheme: true,
        }
      ),
      hasResolvedLinkedThemes: false,
    };
  }

  return {
    linkedThemes: orderLinkedThemes(
      legacyAvailableThemeKeys.map((key) => ({
        key,
        previewUrl: legacyPreviewUrlMap[key] ?? null,
      })),
      defaultTheme,
      {
        ensureDefaultTheme: true,
      }
    ),
    hasResolvedLinkedThemes: true,
  };
}

function resolveLinkedThemeKeys(
  seed: MobileInvitationSeed | undefined,
  fallbackTheme: MobileInvitationThemeKey
) {
  if (!seed) {
    return {
      linkedThemeKeys: [] as MobileInvitationThemeKey[],
      hasResolvedLinkedThemes: false,
    };
  }

  const variants = seed.variants;
  const linkedThemeKeys = INVITATION_THEME_KEYS.filter((key) => variants?.[key]?.available);

  return {
    linkedThemeKeys: linkedThemeKeys.length > 0 ? [...linkedThemeKeys] : [fallbackTheme],
    hasResolvedLinkedThemes: true,
  };
}

function buildLinkedThemesFromLinks(
  linkedThemeKeys: MobileInvitationThemeKey[],
  defaultTheme: MobileInvitationThemeKey,
  links: MobileInvitationLinks | undefined
) {
  const defaultPreviewUrl = normalizePreviewUrl(links?.previewUrls.default);

  return orderLinkedThemes(
    linkedThemeKeys.map((key) => ({
      key,
      previewUrl:
        normalizePreviewUrl(links?.previewUrls[key]) ??
        (key === defaultTheme ? defaultPreviewUrl : null),
    })),
    defaultTheme,
    {
      ensureDefaultTheme: linkedThemeKeys.length > 0,
    }
  );
}

function mergeLinkedThemes(
  existingThemes: LinkedInvitationTheme[],
  nextThemes: LinkedInvitationTheme[],
  defaultTheme: MobileInvitationThemeKey,
  preferNextThemeKeys: boolean
) {
  const existingMap = existingThemes.reduce<Map<MobileInvitationThemeKey, LinkedInvitationTheme>>(
    (accumulator, theme) => accumulator.set(theme.key, theme),
    new Map()
  );
  const nextMap = nextThemes.reduce<Map<MobileInvitationThemeKey, LinkedInvitationTheme>>(
    (accumulator, theme) => accumulator.set(theme.key, theme),
    new Map()
  );

  const baseKeys = preferNextThemeKeys
    ? (nextThemes.length > 0 ? nextThemes : existingThemes).map((theme) => theme.key)
    : (existingThemes.length > 0 ? existingThemes : nextThemes).map((theme) => theme.key);

  const mergedThemes = baseKeys
    .filter(isInvitationThemeKey)
    .map((key) => {
      const previewUrl = preferNextThemeKeys
        ? nextMap.get(key)?.previewUrl ?? existingMap.get(key)?.previewUrl ?? null
        : existingMap.get(key)?.previewUrl ?? nextMap.get(key)?.previewUrl ?? null;

      return {
        key,
        previewUrl,
      } satisfies LinkedInvitationTheme;
    });

  return orderLinkedThemes(mergedThemes, defaultTheme, {
    ensureDefaultTheme: mergedThemes.length > 0,
  });
}

function normalizeStoredLinkedInvitationCard(
  input: unknown,
  tokenMap: LinkedInvitationTokenMap
): LinkedInvitationCard | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Record<string, unknown>;
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
  const displayName = typeof record.displayName === 'string' ? record.displayName : '';

  if (!slug || !displayName) {
    return null;
  }

  const productTier =
    record.productTier === 'standard' ||
    record.productTier === 'deluxe' ||
    record.productTier === 'premium'
      ? record.productTier
      : 'standard';
  const defaultTheme = isInvitationThemeKey(record.defaultTheme)
    ? record.defaultTheme
    : DEFAULT_INVITATION_THEME;
  const { linkedThemes, hasResolvedLinkedThemes } = normalizeStoredLinkedThemes(
    record,
    defaultTheme
  );

  const storedSession =
    record.session && typeof record.session === 'object'
      ? (record.session as Record<string, unknown>)
      : null;
  const storedToken = tokenMap[slug]?.trim() ?? '';
  const session =
    storedSession &&
    typeof storedSession.pageSlug === 'string' &&
    typeof storedSession.expiresAt === 'number' &&
    storedToken
      ? ({
          token: storedToken,
          pageSlug: storedSession.pageSlug,
          expiresAt: storedSession.expiresAt,
        } satisfies MobileSessionSummary)
      : null;

  return {
    slug,
    displayName,
    productTier,
    defaultTheme,
    published: record.published === true,
    showMusic: coerceFeatureFlag(record, 'showMusic'),
    showGuestbook: coerceFeatureFlag(record, 'showGuestbook'),
    publicUrl: typeof record.publicUrl === 'string' ? record.publicUrl : null,
    linkedThemes,
    displayPeriod:
      record.displayPeriod && typeof record.displayPeriod === 'object'
        ? {
            enabled: (record.displayPeriod as Record<string, unknown>).enabled === true,
            startDate:
              typeof (record.displayPeriod as Record<string, unknown>).startDate === 'string'
                ? ((record.displayPeriod as Record<string, unknown>).startDate as string)
                : null,
            endDate:
              typeof (record.displayPeriod as Record<string, unknown>).endDate === 'string'
                ? ((record.displayPeriod as Record<string, unknown>).endDate as string)
                : null,
          }
        : {
            enabled: false,
            startDate: null,
            endDate: null,
          },
    updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : 0,
    ticketCount:
      typeof record.ticketCount === 'number' && Number.isFinite(record.ticketCount)
        ? Math.max(0, Math.floor(record.ticketCount))
        : 0,
    session,
    hasResolvedLinkedThemes,
  };
}

export function getLinkedInvitationThemeKeys(card: LinkedInvitationCard) {
  return card.linkedThemes.length > 0
    ? card.linkedThemes.map((theme) => theme.key)
    : [card.defaultTheme];
}

export function getLinkedInvitationThemePreviewUrl(
  card: LinkedInvitationCard,
  themeKey: MobileInvitationThemeKey
) {
  const linkedTheme = card.linkedThemes.find((theme) => theme.key === themeKey);
  if (linkedTheme?.previewUrl) {
    return linkedTheme.previewUrl;
  }

  return themeKey === card.defaultTheme ? card.publicUrl : null;
}

export function sanitizeLinkedInvitationCards(
  stored: unknown,
  tokenMap: LinkedInvitationTokenMap = {}
) {
  return Array.isArray(stored)
    ? stored
        .map((item) => normalizeStoredLinkedInvitationCard(item, tokenMap))
        .filter((item): item is LinkedInvitationCard => item !== null)
        .slice(0, MAX_LINKED_INVITATION_CARD_COUNT)
    : [];
}

export function buildLinkedInvitationCardFromPageSummary(
  pageSummary: MobilePageSummary,
  options?: {
    publicUrl?: string | null;
    links?: MobileInvitationLinks;
    config?: MobileInvitationSeed;
    updatedAt?: number;
    ticketCount?: number;
    session?: MobileSessionSummary | null;
  }
): LinkedInvitationCard {
  const { linkedThemeKeys, hasResolvedLinkedThemes } = resolveLinkedThemeKeys(
    options?.config,
    pageSummary.defaultTheme
  );

  return {
    slug: pageSummary.slug,
    displayName: pageSummary.displayName,
    productTier: pageSummary.productTier,
    defaultTheme: pageSummary.defaultTheme,
    published: pageSummary.published,
    showMusic: pageSummary.features.showMusic,
    showGuestbook: pageSummary.features.showGuestbook,
    publicUrl: options?.publicUrl ?? null,
    linkedThemes: buildLinkedThemesFromLinks(
      linkedThemeKeys,
      pageSummary.defaultTheme,
      options?.links
    ),
    displayPeriod: pageSummary.displayPeriod,
    updatedAt: options?.updatedAt ?? Date.now(),
    ticketCount: Math.max(0, Math.floor(options?.ticketCount ?? 0)),
    session: options?.session ?? null,
    hasResolvedLinkedThemes,
  };
}

export function mergeLinkedInvitationCard(
  existing: LinkedInvitationCard | undefined,
  nextCard: LinkedInvitationCard
) {
  const shouldPreferNextLinkedThemes =
    nextCard.hasResolvedLinkedThemes || !existing;
  const mergedLinkedThemes = mergeLinkedThemes(
    existing?.linkedThemes ?? [],
    nextCard.linkedThemes,
    nextCard.defaultTheme,
    shouldPreferNextLinkedThemes
  );

  return {
    ...nextCard,
    publicUrl: nextCard.publicUrl ?? existing?.publicUrl ?? null,
    linkedThemes:
      mergedLinkedThemes.length > 0
        ? mergedLinkedThemes
        : orderLinkedThemes(
            [
              {
                key: nextCard.defaultTheme,
                previewUrl: null,
              },
            ],
            nextCard.defaultTheme,
            {
              ensureDefaultTheme: true,
            }
          ),
    displayPeriod: nextCard.displayPeriod ?? existing?.displayPeriod ?? {
      enabled: false,
      startDate: null,
      endDate: null,
    },
    ticketCount: nextCard.ticketCount,
    session: nextCard.session ?? existing?.session ?? null,
    hasResolvedLinkedThemes:
      nextCard.hasResolvedLinkedThemes || existing?.hasResolvedLinkedThemes || false,
  };
}

export function canActivateLinkedInvitationCard(
  card: LinkedInvitationCard,
  now = Date.now()
) {
  return Boolean(
    card.session &&
      card.session.pageSlug === card.slug &&
      card.session.expiresAt > now + LINKED_INVITATION_SESSION_EXPIRY_BUFFER_MS
  );
}
