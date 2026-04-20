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

import { getStoredJson, setStoredJson } from './storage';

export type LinkedInvitationCard = {
  slug: string;
  displayName: string;
  productTier: MobileInvitationProductTier;
  defaultTheme: MobileInvitationThemeKey;
  published: boolean;
  showMusic: boolean;
  showGuestbook: boolean;
  publicUrl: string | null;
  previewUrls: Partial<Record<MobileInvitationThemeKey, string>>;
  availableThemeKeys: MobileInvitationThemeKey[];
  displayPeriod: MobileDisplayPeriodSummary;
  updatedAt: number;
  ticketCount: number;
  session: MobileSessionSummary | null;
};

type StoredLinkedInvitationCard = Omit<LinkedInvitationCard, 'session'> & {
  session: Pick<MobileSessionSummary, 'pageSlug' | 'expiresAt'> | null;
};

type LinkedInvitationTokenMap = Record<string, string>;

export const LINKED_INVITATION_CARDS_STORAGE_KEY =
  'mobile-invitation:linked-invitation-cards';
const LINKED_INVITATION_TOKENS_STORAGE_KEY =
  'mobile-invitation:linked-invitation-card-tokens';
export const MAX_LINKED_INVITATION_CARD_COUNT = 8;
const LINKED_INVITATION_SESSION_EXPIRY_BUFFER_MS = 30 * 1000;

function coerceFeatureFlag(features: unknown, key: keyof MobileInvitationFeatureFlags) {
  return Boolean(
    features &&
      typeof features === 'object' &&
      key in features &&
      (features as Record<string, unknown>)[key]
  );
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

  const previewUrls =
    record.previewUrls && typeof record.previewUrls === 'object'
      ? INVITATION_THEME_KEYS.reduce<
          Partial<Record<MobileInvitationThemeKey, string>>
        >((accumulator, key) => {
          const value = (record.previewUrls as Record<string, unknown>)[key];
          if (typeof value === 'string' && value.trim()) {
            accumulator[key] = value.trim();
          }
          return accumulator;
        }, {})
      : {};

  const availableThemeKeys = Array.isArray(record.availableThemeKeys)
    ? record.availableThemeKeys.filter(isInvitationThemeKey)
    : [];

  return {
    slug,
    displayName,
    productTier,
    defaultTheme,
    published: record.published === true,
    showMusic: coerceFeatureFlag(record, 'showMusic'),
    showGuestbook: coerceFeatureFlag(record, 'showGuestbook'),
    publicUrl: typeof record.publicUrl === 'string' ? record.publicUrl : null,
    previewUrls,
    availableThemeKeys:
      availableThemeKeys.length > 0
        ? Array.from(new Set(availableThemeKeys))
        : [defaultTheme],
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
  };
}

function toStoredLinkedInvitationCard(card: LinkedInvitationCard): StoredLinkedInvitationCard {
  return {
    ...card,
    session: card.session
      ? {
          pageSlug: card.session.pageSlug,
          expiresAt: card.session.expiresAt,
        }
      : null,
  };
}

function buildLinkedInvitationTokenMap(cards: LinkedInvitationCard[]) {
  return cards.reduce<LinkedInvitationTokenMap>((tokenMap, card) => {
    const token = card.session?.token?.trim();
    if (token) {
      tokenMap[card.slug] = token;
    }
    return tokenMap;
  }, {});
}

function resolveAvailableThemeKeys(
  seed: MobileInvitationSeed | undefined,
  fallbackTheme: MobileInvitationThemeKey
) {
  const variants = seed?.variants;
  const availableThemeKeys = INVITATION_THEME_KEYS.filter(
    (key) => variants?.[key]?.available
  );

  return availableThemeKeys.length > 0 ? [...availableThemeKeys] : [fallbackTheme];
}

function resolvePreviewUrls(links: MobileInvitationLinks | undefined) {
  return INVITATION_THEME_KEYS.reduce<
    Partial<Record<MobileInvitationThemeKey, string>>
  >((accumulator, key) => {
    const value = links?.previewUrls[key];
    if (typeof value === 'string' && value.trim()) {
      accumulator[key] = value.trim();
    }
    return accumulator;
  }, {});
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
  return {
    slug: pageSummary.slug,
    displayName: pageSummary.displayName,
    productTier: pageSummary.productTier,
    defaultTheme: pageSummary.defaultTheme,
    published: pageSummary.published,
    showMusic: pageSummary.features.showMusic,
    showGuestbook: pageSummary.features.showGuestbook,
    publicUrl: options?.publicUrl ?? null,
    previewUrls: resolvePreviewUrls(options?.links),
    availableThemeKeys: resolveAvailableThemeKeys(options?.config, pageSummary.defaultTheme),
    displayPeriod: pageSummary.displayPeriod,
    updatedAt: options?.updatedAt ?? Date.now(),
    ticketCount: Math.max(0, Math.floor(options?.ticketCount ?? 0)),
    session: options?.session ?? null,
  };
}

export function mergeLinkedInvitationCard(
  existing: LinkedInvitationCard | undefined,
  nextCard: LinkedInvitationCard
) {
  return {
    ...nextCard,
    publicUrl: nextCard.publicUrl ?? existing?.publicUrl ?? null,
    previewUrls:
      Object.keys(nextCard.previewUrls).length > 0
        ? nextCard.previewUrls
        : existing?.previewUrls ?? {},
    availableThemeKeys:
      nextCard.availableThemeKeys.length > 0
        ? nextCard.availableThemeKeys
        : existing?.availableThemeKeys ?? [nextCard.defaultTheme],
    displayPeriod: nextCard.displayPeriod ?? existing?.displayPeriod ?? {
      enabled: false,
      startDate: null,
      endDate: null,
    },
    ticketCount: nextCard.ticketCount,
    session: nextCard.session ?? existing?.session ?? null,
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

export async function getLinkedInvitationCards() {
  const [storedCards, storedTokens] = await Promise.all([
    getStoredJson<unknown>(LINKED_INVITATION_CARDS_STORAGE_KEY, []),
    getStoredJson<LinkedInvitationTokenMap>(LINKED_INVITATION_TOKENS_STORAGE_KEY, {}, {
      sensitive: true,
    }),
  ]);

  return sanitizeLinkedInvitationCards(storedCards, storedTokens);
}

export async function setLinkedInvitationCards(cards: LinkedInvitationCard[]) {
  const nextCards = cards.slice(0, MAX_LINKED_INVITATION_CARD_COUNT);
  await Promise.all([
    setStoredJson(
      LINKED_INVITATION_CARDS_STORAGE_KEY,
      nextCards.map(toStoredLinkedInvitationCard)
    ),
    setStoredJson(
      LINKED_INVITATION_TOKENS_STORAGE_KEY,
      buildLinkedInvitationTokenMap(nextCards),
      {
        sensitive: true,
      }
    ),
  ]);
}

export async function getLinkedInvitationCardBySlug(slug: string) {
  const cards = await getLinkedInvitationCards();
  return cards.find((item) => item.slug === slug) ?? null;
}

export async function upsertLinkedInvitationCard(card: LinkedInvitationCard) {
  const cards = await getLinkedInvitationCards();
  const existing = cards.find((item) => item.slug === card.slug);
  const nextCard = mergeLinkedInvitationCard(existing, card);
  const nextCards = [nextCard, ...cards.filter((item) => item.slug !== nextCard.slug)].slice(
    0,
    MAX_LINKED_INVITATION_CARD_COUNT
  );

  await setLinkedInvitationCards(nextCards);
  return nextCard;
}

export async function incrementLinkedInvitationTicketCount(
  slug: string,
  amount: number,
  fallbackCard?: LinkedInvitationCard
) {
  const cards = await getLinkedInvitationCards();
  const existing = cards.find((item) => item.slug === slug) ?? fallbackCard ?? null;

  if (!existing) {
    return null;
  }

  const nextCard: LinkedInvitationCard = {
    ...existing,
    updatedAt: Date.now(),
    ticketCount: Math.max(0, existing.ticketCount + amount),
  };

  const nextCards = [nextCard, ...cards.filter((item) => item.slug !== slug)].slice(
    0,
    MAX_LINKED_INVITATION_CARD_COUNT
  );

  await setLinkedInvitationCards(nextCards);
  return nextCard;
}
