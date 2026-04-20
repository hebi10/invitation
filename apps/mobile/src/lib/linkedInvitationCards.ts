import type { MobileSessionSummary } from '../types/mobileInvitation';
import { getStoredJson, setStoredJson } from './storage';

export {
  buildLinkedInvitationCardFromPageSummary,
  canActivateLinkedInvitationCard,
  getLinkedInvitationThemeKeys,
  getLinkedInvitationThemePreviewUrl,
  LINKED_INVITATION_CARDS_STORAGE_KEY,
  MAX_LINKED_INVITATION_CARD_COUNT,
  mergeLinkedInvitationCard,
  sanitizeLinkedInvitationCards,
  type LinkedInvitationCard,
  type LinkedInvitationTheme,
} from './linkedInvitationCardsModel';
import {
  LINKED_INVITATION_CARDS_STORAGE_KEY,
  MAX_LINKED_INVITATION_CARD_COUNT,
  mergeLinkedInvitationCard,
  sanitizeLinkedInvitationCards,
  type LinkedInvitationCard,
} from './linkedInvitationCardsModel';

type StoredLinkedInvitationCard = Omit<
  LinkedInvitationCard,
  'session' | 'hasResolvedLinkedThemes'
> & {
  session: Pick<MobileSessionSummary, 'pageSlug' | 'expiresAt'> | null;
};

type LinkedInvitationTokenMap = Record<string, string>;

const LINKED_INVITATION_TOKENS_STORAGE_KEY =
  'mobile-invitation:linked-invitation-card-tokens';

function toStoredLinkedInvitationCard(card: LinkedInvitationCard): StoredLinkedInvitationCard {
  return {
    slug: card.slug,
    displayName: card.displayName,
    productTier: card.productTier,
    defaultTheme: card.defaultTheme,
    published: card.published,
    showMusic: card.showMusic,
    showGuestbook: card.showGuestbook,
    publicUrl: card.publicUrl,
    linkedThemes: card.linkedThemes,
    displayPeriod: card.displayPeriod,
    updatedAt: card.updatedAt,
    ticketCount: card.ticketCount,
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
