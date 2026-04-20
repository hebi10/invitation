import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildLinkedInvitationCardFromPageSummary,
  canActivateLinkedInvitationCard,
  getLinkedInvitationCards,
  getLinkedInvitationThemeKeys,
  type LinkedInvitationCard,
  MAX_LINKED_INVITATION_CARD_COUNT,
  mergeLinkedInvitationCard,
  setLinkedInvitationCards as persistLinkedInvitationCards,
} from '../../../lib/linkedInvitationCards';
import { validateMobileClientEditorSession } from '../../../lib/api';
import type {
  MobileEditableInvitationPageConfig,
  MobileInvitationLinks,
  MobilePageSummary,
  MobileSessionSummary,
} from '../../../types/mobileInvitation';

type UseLinkedInvitationManagerOptions = {
  apiBaseUrl: string;
  dashboardConfig: MobileEditableInvitationPageConfig['config'] | null | undefined;
  links: MobileInvitationLinks | null | undefined;
  pageSummary: MobilePageSummary | null;
  session: MobileSessionSummary | null;
  activateStoredSession: (candidateSession: MobileSessionSummary) => Promise<boolean>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  setNotice: (message: string) => void;
};

const LINKED_INVITATION_SYNC_BATCH_SIZE = 2;
const LINKED_INVITATION_BACKGROUND_SYNC_STALE_MS = 5 * 60 * 1000;

function sortLinkedInvitationCardsForSync(
  cards: LinkedInvitationCard[],
  activeSlug: string | null
) {
  return [...cards].sort((left, right) => {
    const leftPriority = left.slug === activeSlug ? 0 : 1;
    const rightPriority = right.slug === activeSlug ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.updatedAt - left.updatedAt;
  });
}

export function useLinkedInvitationManager({
  apiBaseUrl,
  dashboardConfig,
  links,
  pageSummary,
  session,
  activateStoredSession,
  logout,
  clearAuthError,
  setNotice,
}: UseLinkedInvitationManagerOptions) {
  const [linkedInvitationCards, setLinkedInvitationCards] = useState<LinkedInvitationCard[]>([]);
  const [hasLoadedLinkedInvitationCards, setHasLoadedLinkedInvitationCards] = useState(false);
  const [previewLinkCardSlug, setPreviewLinkCardSlug] = useState<string | null>(null);
  const [activatingLinkedInvitationSlug, setActivatingLinkedInvitationSlug] = useState<string | null>(
    null
  );

  const reloadLinkedInvitationCards = useCallback(
    async (options: { syncWithServer?: boolean } = {}) => {
      const stored = await getLinkedInvitationCards();

      if (!options.syncWithServer) {
        setLinkedInvitationCards(stored);
        setHasLoadedLinkedInvitationCards(true);
        return;
      }

      const activeSlug = pageSummary?.slug ?? session?.pageSlug ?? null;
      const now = Date.now();
      const orderedCards = sortLinkedInvitationCardsForSync(stored, activeSlug);
      const refreshedCardMap = new Map(stored.map((card) => [card.slug, card]));

      for (
        let startIndex = 0;
        startIndex < orderedCards.length;
        startIndex += LINKED_INVITATION_SYNC_BATCH_SIZE
      ) {
        const batch = orderedCards.slice(
          startIndex,
          startIndex + LINKED_INVITATION_SYNC_BATCH_SIZE
        );

        const batchResults = await Promise.allSettled(
          batch.map(async (card) => {
            if (!card.session || !canActivateLinkedInvitationCard(card, now)) {
              return card;
            }

            const shouldDelayValidation =
              card.slug !== activeSlug &&
              card.updatedAt > 0 &&
              now - card.updatedAt < LINKED_INVITATION_BACKGROUND_SYNC_STALE_MS;

            if (shouldDelayValidation) {
              return card;
            }

            const sessionResponse = await validateMobileClientEditorSession(
              apiBaseUrl,
              card.slug,
              card.session.token
            );

            if (!sessionResponse.authenticated || !sessionResponse.page) {
              return card;
            }

            return mergeLinkedInvitationCard(
              card,
              buildLinkedInvitationCardFromPageSummary(sessionResponse.page, {
                publicUrl: sessionResponse.links?.publicUrl ?? card.publicUrl,
                links: sessionResponse.links,
                config: sessionResponse.dashboardPage?.config,
                updatedAt: Date.now(),
                ticketCount: sessionResponse.page.ticketCount,
                session: card.session,
              })
            );
          })
        );

        batchResults.forEach((result, index) => {
          const sourceCard = batch[index];
          refreshedCardMap.set(
            sourceCard.slug,
            result.status === 'fulfilled' ? result.value : sourceCard
          );
        });
      }

      const refreshedCards = stored.map(
        (card) => refreshedCardMap.get(card.slug) ?? card
      );

      setLinkedInvitationCards(refreshedCards);
      setHasLoadedLinkedInvitationCards(true);
      await persistLinkedInvitationCards(refreshedCards);
    },
    [apiBaseUrl, pageSummary?.slug, session?.pageSlug]
  );

  const activeLinkedInvitationCard = useMemo<LinkedInvitationCard | null>(() => {
    if (!pageSummary) {
      return null;
    }

    return buildLinkedInvitationCardFromPageSummary(pageSummary, {
      publicUrl: links?.publicUrl ?? null,
      links: links ?? undefined,
      config: dashboardConfig ?? undefined,
      updatedAt: 0,
      ticketCount: pageSummary.ticketCount,
      session,
    });
  }, [dashboardConfig, links, pageSummary, session]);

  const additionalLinkedInvitationCards = useMemo(
    () =>
      linkedInvitationCards
        .filter(
          (item) =>
            item.slug !== pageSummary?.slug && canActivateLinkedInvitationCard(item)
        )
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [linkedInvitationCards, pageSummary?.slug]
  );

  const previewLinkTargetCard = useMemo(
    () =>
      [activeLinkedInvitationCard, ...additionalLinkedInvitationCards].find(
        (item): item is LinkedInvitationCard =>
          item !== null && item.slug === previewLinkCardSlug
      ) ?? null,
    [activeLinkedInvitationCard, additionalLinkedInvitationCards, previewLinkCardSlug]
  );

  const previewLinkThemeKeys = useMemo(
    () =>
      previewLinkTargetCard
        ? getLinkedInvitationThemeKeys(previewLinkTargetCard)
        : [],
    [previewLinkTargetCard]
  );

  useFocusEffect(
    useCallback(() => {
      void reloadLinkedInvitationCards();
    }, [reloadLinkedInvitationCards])
  );

  useEffect(() => {
    if (!hasLoadedLinkedInvitationCards) {
      return;
    }

    void persistLinkedInvitationCards(linkedInvitationCards);
  }, [hasLoadedLinkedInvitationCards, linkedInvitationCards]);

  useEffect(() => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    setLinkedInvitationCards((current) => {
      const existing = current.find((item) => item.slug === activeLinkedInvitationCard.slug);
      const nextCard = mergeLinkedInvitationCard(existing, {
        ...activeLinkedInvitationCard,
        updatedAt: Date.now(),
      });

      if (
        existing &&
        existing.displayName === nextCard.displayName &&
        existing.productTier === nextCard.productTier &&
        existing.defaultTheme === nextCard.defaultTheme &&
        existing.published === nextCard.published &&
        existing.showMusic === nextCard.showMusic &&
        existing.showGuestbook === nextCard.showGuestbook &&
        existing.publicUrl === nextCard.publicUrl &&
        JSON.stringify(existing.linkedThemes) === JSON.stringify(nextCard.linkedThemes) &&
        JSON.stringify(existing.displayPeriod) === JSON.stringify(nextCard.displayPeriod) &&
        existing.ticketCount === nextCard.ticketCount
      ) {
        return current;
      }

      return [nextCard, ...current.filter((item) => item.slug !== nextCard.slug)].slice(
        0,
        MAX_LINKED_INVITATION_CARD_COUNT
      );
    });
  }, [activeLinkedInvitationCard]);

  const handleLinkAnotherInvitation = useCallback(
    async (pageSlugToRelink?: string) => {
      setNotice(
        pageSlugToRelink
          ? `${pageSlugToRelink} 청첩장을 다시 연동하려면 비밀번호를 입력해 주세요.`
          : '다른 청첩장을 연동하려면 슬러그와 비밀번호를 입력해 주세요.'
      );
      await logout();
      clearAuthError();
    },
    [clearAuthError, logout, setNotice]
  );

  const handleActivateLinkedInvitation = useCallback(
    async (card: LinkedInvitationCard) => {
      if (!canActivateLinkedInvitationCard(card)) {
        await handleLinkAnotherInvitation(card.slug);
        return;
      }

      const activatableSession = card.session;
      if (!activatableSession) {
        await handleLinkAnotherInvitation(card.slug);
        return;
      }

      if (session?.pageSlug === card.slug) {
        setNotice(`${card.displayName.trim() || card.slug} 청첩장이 이미 열려 있습니다.`);
        return;
      }

      setNotice(`${card.displayName.trim() || card.slug} 청첩장을 불러오는 중입니다.`);
      clearAuthError();

      setActivatingLinkedInvitationSlug(card.slug);
      try {
        const activated = await activateStoredSession(activatableSession);
        if (!activated) {
          setNotice(
            `${card.displayName.trim() || card.slug} 청첩장의 저장된 연동 정보가 만료되었습니다. 다시 연동해 주세요.`
          );
          return;
        }

        await reloadLinkedInvitationCards();
        setNotice(`${card.displayName.trim() || card.slug} 청첩장으로 전환했습니다.`);
      } finally {
        setActivatingLinkedInvitationSlug(null);
      }
    },
    [
      activateStoredSession,
      clearAuthError,
      handleLinkAnotherInvitation,
      reloadLinkedInvitationCards,
      session?.pageSlug,
      setNotice,
    ]
  );

  const openPreviewLinkModal = useCallback((slug: string) => {
    setPreviewLinkCardSlug(slug);
  }, []);

  const closePreviewLinkModal = useCallback(() => {
    setPreviewLinkCardSlug(null);
  }, []);

  return {
    linkedInvitationCards,
    setLinkedInvitationCards,
    activeLinkedInvitationCard,
    additionalLinkedInvitationCards,
    previewLinkTargetCard,
    previewLinkThemeKeys,
    activatingLinkedInvitationSlug,
    reloadLinkedInvitationCards,
    handleLinkAnotherInvitation,
    handleActivateLinkedInvitation,
    openPreviewLinkModal,
    closePreviewLinkModal,
  };
}
