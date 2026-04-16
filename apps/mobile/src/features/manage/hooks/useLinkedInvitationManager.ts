import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildLinkedInvitationCardFromPageSummary,
  getLinkedInvitationCards,
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

      const refreshedCardResults = await Promise.allSettled(
        stored.map(async (card) => {
          if (!card.session) {
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

      const refreshedCards = refreshedCardResults.map((result, index) =>
        result.status === 'fulfilled' ? result.value : stored[index]
      );

      setLinkedInvitationCards(refreshedCards);
      setHasLoadedLinkedInvitationCards(true);
      await persistLinkedInvitationCards(refreshedCards);
    },
    [apiBaseUrl]
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
        .filter((item) => item.slug !== pageSummary?.slug)
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
      previewLinkTargetCard?.availableThemeKeys.length
        ? previewLinkTargetCard.availableThemeKeys
        : previewLinkTargetCard
          ? [previewLinkTargetCard.defaultTheme]
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
        existing.availableThemeKeys.join('|') === nextCard.availableThemeKeys.join('|') &&
        JSON.stringify(existing.previewUrls) === JSON.stringify(nextCard.previewUrls) &&
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
      if (!card.session) {
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
        const activated = await activateStoredSession(card.session);
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
