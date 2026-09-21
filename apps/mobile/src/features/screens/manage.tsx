import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Linking, ScrollView, View } from 'react-native';

import { EditorPreparingModal } from '../manage/components/EditorPreparingModal';
import { GuestbookModal } from '../manage/components/GuestbookModal';
import { LinkedInvitationsSection } from '../manage/components/LinkedInvitationsSection';
import { ManageEditorStepContent } from '../manage/components/ManageEditorStepContent';
import { OnboardingModal } from '../manage/components/OnboardingModal';
import { TicketUsageModal } from '../manage/components/TicketUsageModal';
import { useAddressSearch } from '../manage/hooks/useAddressSearch';
import { useGuestbook } from '../manage/hooks/useGuestbook';
import { useImageUpload } from '../manage/hooks/useImageUpload';
import { useInvitationForm } from '../manage/hooks/useInvitationForm';
import { useLinkedInvitationManager } from '../manage/hooks/useLinkedInvitationManager';
import { useMusicLibrary } from '../manage/hooks/useMusicLibrary';
import { useTicketOperations } from '../manage/hooks/useTicketOperations';
import { formatDateLabel, formatThemeList } from '../manage/linkedInvitationDisplay';
import { manageStyles } from '../manage/manageStyles';
import { EDITOR_STEPS } from '../manage/shared';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { ChoiceChip } from '../../components/ChoiceChip';
import { InvitationEditorModalShell } from '../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../components/SectionCard';
import { useAuth } from '../../contexts/AuthContext';
import { useInvitationOps } from '../../contexts/InvitationOpsContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useNoticeToast } from '../../hooks/useNoticeToast';
import {
  issueMobileClientEditorLinkToken,
  revokeMobileClientEditorLinkTokens,
} from '../../lib/api';
import { buildManageAppDeepLink } from '../../lib/appDeepLink';
import {
  getInvitationThemeLabel,
} from '../../lib/invitationThemes';
import {
  getLinkedInvitationThemeKeys,
  type LinkedInvitationCard,
} from '../../lib/linkedInvitationCards';
import { copyTextWithFallback } from '../../lib/textTransfer';
import { createPrivatePreviewUrl } from '../../lib/apiPreview';
import type {
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

export default function ManageScreen() {
  const { apiBaseUrl, palette, fontScale } = usePreferences();
  const {
    activateStoredSession,
    authError,
    clearAuthError,
    clearPendingManageOnboarding,
    getHighRiskToken,
    logout,
    pendingManageOnboarding,
    runHighRiskAction,
    session,
  } = useAuth();
  const {
    dashboard,
    dashboardLoading,
    manageComment,
    pageSummary,
    refreshDashboard,
    saveCurrentPageConfig,
    extendDisplayPeriod,
    setPublishedState,
    transferTicketCount,
  } = useInvitationOps();
  const [notice, setNotice] = useState('');
  const [needsRefreshRetry, setNeedsRefreshRetry] = useState(false);
  const [isEditorFinalizing, setIsEditorFinalizing] = useState(false);
  const [isIssuingAppLink, setIsIssuingAppLink] = useState(false);
  const [isRevokingAppLink, setIsRevokingAppLink] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [savedNextSteps, setSavedNextSteps] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [isOpeningPreview, setIsOpeningPreview] = useState(false);
  const { ticketIntent, targetPageSlug } = useLocalSearchParams<{ ticketIntent?: string; targetPageSlug?: string }>();
  const handledTicketIntent = useRef<string | null>(null);

  useNoticeToast(notice);
  useNoticeToast(authError, { tone: 'error' });

  const invitationForm = useInvitationForm({
    dashboard,
    pendingManageOnboarding,
    dashboardLoading,
    clearAuthError,
    clearPendingManageOnboarding,
    refreshDashboard,
    saveCurrentPageConfig,
    setPublishedState,
    setNotice,
  });

  const {
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
  } = useLinkedInvitationManager({
    apiBaseUrl,
    dashboardConfig: dashboard?.page.config,
    links: dashboard?.links,
    pageSummary,
    session,
    activateStoredSession,
    logout,
    clearAuthError,
    setNotice,
  });

  const addressSearch = useAddressSearch({
    apiBaseUrl,
    setForm: invitationForm.setForm,
    setNotice,
  });

  const musicLibrary = useMusicLibrary({
    apiBaseUrl,
    supportsMusicFeature: dashboard?.page.features.showMusic ?? false,
    form: invitationForm.form,
    setForm: invitationForm.setForm,
    setNotice,
  });

  const imageUpload = useImageUpload({
    apiBaseUrl,
    dashboard,
    session,
    galleryPreviewItems: invitationForm.galleryPreviewItems,
    setForm: invitationForm.setForm,
    setNotice,
  });

  const guestbook = useGuestbook({
    dashboard,
    dashboardLoading,
    refreshDashboard: (options) =>
      invitationForm.requestDashboardSync(undefined, options),
    manageComment,
    setNotice,
  });

  const handleCloseEditorModal = async (discard = false) => {
    if (imageUpload.uploadProgress) {
      setNotice('이미지 업로드가 끝난 뒤 편집창을 닫아 주세요.');
      return;
    }

    if (isEditorFinalizing || invitationForm.isSaving) {
      return;
    }

    if (invitationForm.isFormDirty && !discard) {
      setConfirmDiscard(true);
      return;
    }

    setIsEditorFinalizing(true);
    try {
      const cleaned = await imageUpload.discardTrackedUploads();
      invitationForm.closeEditorModal();
      setConfirmDiscard(false);

      if (!cleaned) {
        setNotice(
          '편집창은 닫았지만 임시 업로드 이미지를 정리하지 못했습니다. 잠시 후 다시 확인해 주세요.'
        );
      }
    } finally {
      setIsEditorFinalizing(false);
    }
  };

  const handleSaveEditor = async () => {
    Keyboard.dismiss();
    if (imageUpload.uploadProgress) {
      setNotice('이미지 업로드가 끝난 뒤 저장해 주세요.');
      return;
    }

    if (invitationForm.isSaving || isEditorFinalizing) {
      return;
    }

    setIsEditorFinalizing(true);
    try {
      const saved = await invitationForm.persistForm({
        notice: '운영 정보를 저장했습니다.',
        suppressNotice: true,
      });

      if (!saved) {
        return;
      }

      const cleaned = await imageUpload.finalizeTrackedUploads(invitationForm.form);
      invitationForm.closeEditorModal();
      setConfirmDiscard(false);
      setSavedNextSteps(true);
      setNotice(
        cleaned
          ? '운영 정보를 저장했습니다.'
          : '운영 정보는 저장했지만 임시 업로드 이미지를 정리하지 못했습니다. 잠시 후 다시 확인해 주세요.'
      );
    } finally {
      setIsEditorFinalizing(false);
    }
  };

  const showDashboardSyncLoading = dashboardLoading && !dashboard && !pageSummary;
  const canRequestDashboardSync = !dashboardLoading;
  const maxGalleryImageCount = dashboard?.page.features.maxGalleryImages ?? 0;
  const supportsMusicFeature = dashboard?.page.features.showMusic ?? false;
  const selectedMusicCategoryLabel =
    musicLibrary.selectedMusicCategory?.label ?? '선택해 주세요';
  const isEditorBusy =
    invitationForm.isSaving ||
    isEditorFinalizing ||
    Boolean(imageUpload.uploadProgress);

  const {
    ticketModalVisible,
    isExtendingDisplayPeriod,
    isTransferringTickets,
    ticketTransferTargetCards,
    selectedTicketTransferTargetCard,
    ticketTransferCount,
    ticketTransferCountOptions,
    setTicketTransferTargetSlug,
    setTicketTransferCount,
    handleOpenTicketModal,
    closeTicketModal,
    handleExtendDisplayPeriod,
    handleTransferTicketCount,
  } = useTicketOperations({
    activeLinkedInvitationCard,
    additionalLinkedInvitationCards,
    extendDisplayPeriod,
    transferTicketCount,
    setNotice,
    setLinkedInvitationCards,
    formatDateLabel,
  });

  const handleCopyPublicUrl = async (card: LinkedInvitationCard) => {
    if (!card.published) {
      setNotice('미리보기로 내용을 확인한 뒤 공개해 주세요. 공개 후 하객에게 주소를 공유할 수 있습니다.');
      return;
    }
    const address = card.publicUrl?.trim() || card.slug;
    if (!address) {
      setNotice('복사할 청첩장 주소를 아직 확인하지 못했습니다.');
      return;
    }

    try {
      const method = await copyTextWithFallback(address);
      setNotice(
        method === 'clipboard'
          ? '청첩장 주소를 복사했습니다.'
          : '이 기기에서는 복사 대신 공유창을 열었습니다.'
      );
    } catch {
      setNotice('청첩장 주소를 전달하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  useEffect(() => {
    if (ticketIntent !== 'extend') { handledTicketIntent.current = null; return; }
    if (!activeLinkedInvitationCard || !dashboard) return;
    const key = `${ticketIntent}:${targetPageSlug ?? activeLinkedInvitationCard.slug}`;
    if (handledTicketIntent.current === key) return;
    if (targetPageSlug && activeLinkedInvitationCard.slug !== targetPageSlug) {
      const target = additionalLinkedInvitationCards.find(card => card.slug === targetPageSlug);
      if (target && !activatingLinkedInvitationSlug && handledTicketIntent.current !== `switch:${key}`) {
        handledTicketIntent.current = `switch:${key}`;
        void handleActivateLinkedInvitation(target);
      }
      return;
    }
    if (dashboard.page.slug !== activeLinkedInvitationCard.slug) return;
    handledTicketIntent.current = key;
    handleOpenTicketModal();
    router.setParams({ ticketIntent: undefined, targetPageSlug: undefined });
  }, [ticketIntent, targetPageSlug, activeLinkedInvitationCard, additionalLinkedInvitationCards,
    dashboard, activatingLinkedInvitationSlug, handleActivateLinkedInvitation, handleOpenTicketModal]);

  const handleOpenInApp = async () => {
    const manageAppLink = buildManageAppDeepLink();

    try {
      await Linking.openURL(manageAppLink);
      setNotice('앱 운영 화면을 다시 열었습니다.');
    } catch {
      router.replace('/manage');
      setNotice('앱 운영 화면을 다시 열었습니다.');
    }
  };

  const handleCopyAppLink = async () => {
    if (!session) {
      setNotice('먼저 청첩장을 연동해 주세요.');
      return;
    }

    await runHighRiskAction(
      {
        title: '앱 연동 링크를 발급할까요?',
        description:
          '앱 연동 링크는 15분 안에 한 번만 사용할 수 있습니다. 로그인 세션을 다시 확인한 뒤 발급합니다.',
        confirmLabel: '링크 발급',
      },
      async () => {
        const highRiskToken = getHighRiskToken(session.pageSlug);
        if (!highRiskToken) {
          setNotice('재인증 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
          return false;
        }

        setIsIssuingAppLink(true);

        try {
          const response = await issueMobileClientEditorLinkToken(
            apiBaseUrl,
            session.pageSlug,
            session.token,
            highRiskToken
          );
          const method = await copyTextWithFallback(response.webFallbackUrl);
          setNotice(
            method === 'clipboard'
              ? '앱 연동 링크를 복사했습니다. 15분 안에 한 번만 사용할 수 있습니다.'
              : '이 기기에서는 복사 대신 공유창을 열었습니다. 앱 연동 링크는 15분 안에 한 번만 사용할 수 있습니다.'
          );
          return true;
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : '앱 연동 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'
          );
          return false;
        } finally {
          setIsIssuingAppLink(false);
        }
      }
    );
  };

  const handleRevokeAppLink = async () => {
    if (!session) {
      setNotice('먼저 청첩장을 연동해 주세요.');
      return;
    }

    await runHighRiskAction(
      {
        title: '앱 연동 링크를 폐기할까요?',
        description:
          '현재 발급된 앱 연동 링크를 모두 무효화합니다. 로그인 세션을 다시 확인한 뒤 진행합니다.',
        confirmLabel: '링크 폐기',
      },
      async () => {
        const highRiskToken = getHighRiskToken(session.pageSlug);
        if (!highRiskToken) {
          setNotice('재인증 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
          return false;
        }

        setIsRevokingAppLink(true);

        try {
          const response = await revokeMobileClientEditorLinkTokens(
            apiBaseUrl,
            session.pageSlug,
            session.token,
            highRiskToken
          );
          setNotice(
            response.revokedCount > 0
              ? `활성 앱 연동 링크 ${response.revokedCount}개를 폐기했습니다.`
              : '현재 폐기할 활성 앱 연동 링크가 없습니다.'
          );
          return true;
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : '앱 연동 링크를 폐기하지 못했습니다. 잠시 후 다시 시도해 주세요.'
          );
          return false;
        } finally {
          setIsRevokingAppLink(false);
        }
      }
    );
  };

  const handleOpenUrl = async () => {
    if (!activeLinkedInvitationCard) {
      setNotice('열 수 있는 청첩장 링크를 먼저 확인해 주세요.');
      return;
    }

    try {
      const themeKeys = getLinkedInvitationThemeKeys(activeLinkedInvitationCard);
      if (themeKeys.length > 1) {
        openPreviewLinkModal(activeLinkedInvitationCard.slug);
        return;
      }

      const themeKey = themeKeys[0] ?? activeLinkedInvitationCard.defaultTheme;
      await handleOpenThemeLink(activeLinkedInvitationCard, themeKey);
    } catch {
      setNotice('청첩장 링크를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleOpenMapUrl = async () => {
    if (!invitationForm.mapPreviewUrl) {
      setNotice('지도 링크를 먼저 확인해 주세요.');
      return;
    }

    try {
      try {
        await WebBrowser.openBrowserAsync(invitationForm.mapPreviewUrl, {
          enableDefaultShareMenuItem: true,
          controlsColor: palette.accent,
          createTask: true,
        });
        return;
      } catch {
        // noop
      }

      await Linking.openURL(invitationForm.mapPreviewUrl);
    } catch {
      setNotice('지도를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleRefreshManageScreen = async () => {
    try {
      await reloadLinkedInvitationCards({ syncWithServer: true });
      const synced = await invitationForm.requestDashboardSync();
      if (!synced) {
        setNeedsRefreshRetry(true);
        setNotice('운영 정보를 새로고침하지 못했습니다. 다시 시도해 주세요.');
        return;
      }

      setNeedsRefreshRetry(false);
      setNotice('운영 정보를 새로고침했습니다.');
    } catch {
      setNeedsRefreshRetry(true);
      setNotice('운영 정보를 새로고침하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleOpenThemeLink = async (
    card: LinkedInvitationCard,
    themeKey: MobileInvitationThemeKey
  ) => {
    const previewSession = card.session ?? (session?.pageSlug === card.slug ? session : null);
    if (!previewSession || isOpeningPreview) {
      if (!previewSession) setNotice('다시 로그인한 뒤 미리보기를 열어 주세요.');
      return;
    }

    setIsOpeningPreview(true);
    try {
      const targetUrl = await createPrivatePreviewUrl(apiBaseUrl, card.slug, previewSession.token, themeKey);
      try {
        await WebBrowser.openBrowserAsync(targetUrl, {
          enableDefaultShareMenuItem: false,
          controlsColor: palette.accent,
          createTask: true,
        });
        closePreviewLinkModal();
        return;
      } catch {
        // noop
      }

      await Linking.openURL(targetUrl);
      closePreviewLinkModal();
    } catch {
      setNotice('미리보기를 열지 못했습니다. 로그인과 네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setIsOpeningPreview(false);
    }
  };

  return (
    <>
      <AppScreen
        title="운영"
        subtitle="내용을 완성하고 미리보기로 확인한 뒤 공개·공유해 주세요."
      >
        {showDashboardSyncLoading ? (
          <SectionCard
            onPress={canRequestDashboardSync ? () => void invitationForm.openEditorModal() : undefined}
            title="운영 데이터를 불러오는 중"
            description="페이지 설정과 방명록, 공개 링크를 서버에서 확인하고 있습니다."
          >
            <View style={manageStyles.loadingRow}>
              <AppText variant="muted" style={manageStyles.loadingText}>
                운영 데이터를 동기화하고 있습니다.
              </AppText>
            </View>
          </SectionCard>
        ) : null}

        {notice ? (
          <View
            style={[
              manageStyles.noticeBanner,
              {
                backgroundColor: palette.noticeSoft,
                borderColor: palette.notice,
              },
            ]}
          >
            <AppText color={palette.notice} style={manageStyles.noticeText}>
              {notice}
            </AppText>
          </View>
        ) : null}

        {authError ? (
          <View
            style={[
              manageStyles.noticeBanner,
              {
                backgroundColor: palette.dangerSoft,
                borderColor: palette.danger,
              },
            ]}
          >
            <AppText color={palette.danger} style={manageStyles.noticeText}>
              {authError}
            </AppText>
          </View>
        ) : null}

        {dashboard && activeLinkedInvitationCard ? (
          <SectionCard title={savedNextSteps ? '저장했습니다. 이제 완성 화면을 확인해 주세요.' : '내 청첩장 제작'}
            description="내용 입력 → 미리보기 → 공개 → 공유 순서로 진행합니다.">
            <AppText variant="muted">{dashboard.page.published
              ? '현재 공개 중입니다. 수정한 내용을 확인한 뒤 하객에게 공유해 주세요.'
              : '현재 비공개입니다. 미리보기는 나만 확인할 수 있으며, 공개 전까지 하객에게 보이지 않습니다.'}</AppText>
            <View style={manageStyles.actionRow}>
              <ActionButton variant="secondary" onPress={() => void invitationForm.openEditorModal()}>내용 편집</ActionButton>
              <ActionButton loading={isOpeningPreview} onPress={handleOpenUrl}>미리보기</ActionButton>
              {!dashboard.page.published ? <ActionButton variant="secondary"
                onPress={() => void invitationForm.handleTogglePublished()}>확인 후 공개하기</ActionButton> :
                <ActionButton onPress={() => void handleCopyPublicUrl(activeLinkedInvitationCard)}>공유 주소 복사</ActionButton>}
            </View>
          </SectionCard>
        ) : null}

        {ticketIntent === 'extend' && targetPageSlug && activeLinkedInvitationCard?.slug !== targetPageSlug ? (
          <SectionCard title="티켓을 구매한 청첩장으로 이동해 주세요."
            description="연동 전환에 실패했다면 다시 열거나 해당 청첩장을 연동한 뒤 기간을 연장할 수 있습니다.">
            <ActionButton loading={Boolean(activatingLinkedInvitationSlug)} onPress={() => {
              const target = additionalLinkedInvitationCards.find(card => card.slug === targetPageSlug);
              if (target) void handleActivateLinkedInvitation(target);
              else void handleLinkAnotherInvitation(targetPageSlug);
            }}>구매한 청첩장 다시 열기</ActionButton>
          </SectionCard>
        ) : null}

        <LinkedInvitationsSection
          activeLinkedInvitationCard={activeLinkedInvitationCard}
          additionalLinkedInvitationCards={additionalLinkedInvitationCards}
          palette={palette}
          hasDashboard={Boolean(dashboard)}
          dashboardPublicUrl={dashboard?.links.publicUrl ?? null}
          dashboardCommentCount={dashboard?.commentCount ?? 0}
          dashboardPublished={dashboard?.page.published ?? false}
          canRequestDashboardSync={canRequestDashboardSync}
          needsRefreshRetry={needsRefreshRetry}
          activatingLinkedInvitationSlug={activatingLinkedInvitationSlug}
          onOpenEditor={() => void invitationForm.openEditorModal()}
          onOpenUrl={handleOpenUrl}
          onTogglePublished={() => void invitationForm.handleTogglePublished()}
          onOpenTicketModal={handleOpenTicketModal}
          onCopyPublicUrl={(card) => void handleCopyPublicUrl(card)}
          onOpenInApp={() => void handleOpenInApp()}
          onOpenGuestbook={guestbook.openGuestbookModal}
          onRefresh={() => void handleRefreshManageScreen()}
          onActivateLinkedInvitation={(card) => void handleActivateLinkedInvitation(card)}
        />

        <ActionButton variant="secondary" onPress={() => setAdvancedExpanded(value => !value)}>
          {advancedExpanded ? '기기 연동 설정 접기' : '다른 기기·청첩장 연동 설정'}
        </ActionButton>
        {advancedExpanded && session ? (
          <SectionCard
            title="앱 연동 링크"
            description="다른 기기에서는 1회용 앱 연동 링크로 바로 진입할 수 있습니다."
          >
            <BulletList
              items={[
                '링크는 발급 후 15분 동안만 유효합니다.',
                '발급된 링크는 1회만 사용할 수 있습니다.',
                '새 링크를 발급하면 이전 링크는 자동으로 무효화됩니다.',
              ]}
            />
            <View style={manageStyles.actionRow}>
              <ActionButton
                onPress={() => void handleCopyAppLink()}
                loading={isIssuingAppLink}
                disabled={isRevokingAppLink}
                style={manageStyles.actionHalfButton}
              >
                앱 연동 링크 복사
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={() => void handleRevokeAppLink()}
                loading={isRevokingAppLink}
                disabled={isIssuingAppLink}
                style={manageStyles.actionHalfButton}
              >
                활성 링크 폐기
              </ActionButton>
            </View>
          </SectionCard>
        ) : null}

        {advancedExpanded ? <SectionCard
          title="연동 전환"
          description="현재 연동을 종료하고 다른 청첩장을 새로 연동합니다."
        >
          <ActionButton variant="secondary" onPress={() => void handleLinkAnotherInvitation()} fullWidth>
            다른 청첩장 연동하기
          </ActionButton>
        </SectionCard> : null}
      </AppScreen>

      <EditorPreparingModal
        visible={invitationForm.editorPreparingVisible}
        message={invitationForm.editorPreparingMessage}
      />

      <InvitationEditorModalShell
        visible={invitationForm.editorModalVisible}
        onClose={() => void handleCloseEditorModal()}
        title="청첩장 정보 수정"
        description="순서대로 내용을 입력하고 저장한 뒤 완성 화면을 확인해 주세요."
        palette={palette}
        fontScale={fontScale}
        cardStyle={manageStyles.previewLinkModalCard}
        closeDisabled={isEditorBusy}
        contentDisabled={isEditorBusy}
        closeLoading={isEditorFinalizing && !invitationForm.isSaving}
        closeConfirmation={confirmDiscard ? <View style={{ gap: 8, flex: 1 }}>
          <AppText>저장하지 않은 변경사항이 있습니다.</AppText>
          <ActionButton onPress={() => void handleSaveEditor()} loading={isEditorBusy}>저장 후 닫기</ActionButton>
          <ActionButton variant="secondary" onPress={() => setConfirmDiscard(false)}>계속 편집</ActionButton>
          <ActionButton variant="danger" disabled={isEditorBusy} onPress={() => void handleCloseEditorModal(true)}>변경 취소하고 닫기</ActionButton>
        </View> : undefined}
      >
        <View style={manageStyles.editorStepHeader}>
          <AppText style={manageStyles.editorStepTitle}>
            {invitationForm.currentEditorStep.title}
          </AppText>
          <AppText variant="caption" style={manageStyles.editorStepCounter}>
            {invitationForm.editorStepIndex + 1} / {EDITOR_STEPS.length}
          </AppText>
        </View>
        <AppText variant="muted" style={manageStyles.loadingText}>
          {invitationForm.currentEditorStep.description}
        </AppText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={manageStyles.editorStepChipRow}
        >
          {EDITOR_STEPS.map((step, index) => (
            <ChoiceChip
              key={step.key}
              label={step.title}
              selected={index === invitationForm.editorStepIndex}
              onPress={() => invitationForm.setEditorStepIndex(index)}
            />
          ))}
        </ScrollView>

        <ManageEditorStepContent
          stepKey={invitationForm.currentEditorStep.key}
          form={invitationForm.form}
          mapPreviewUrl={invitationForm.mapPreviewUrl}
          mapLatitude={invitationForm.mapLatitude}
          mapLongitude={invitationForm.mapLongitude}
          galleryPreviewItems={invitationForm.galleryPreviewItems}
          maxGalleryImageCount={maxGalleryImageCount}
          supportsMusicFeature={supportsMusicFeature}
          musicLibraryLoading={musicLibrary.musicLibraryLoading}
          musicCategories={musicLibrary.musicCategories}
          openMusicDropdown={musicLibrary.openMusicDropdown}
          selectedMusicCategoryLabel={selectedMusicCategoryLabel}
          selectedMusicTrackLabel={musicLibrary.selectedMusicTrackLabel}
          availableMusicTracks={musicLibrary.availableMusicTracks}
          uploadingImageKind={imageUpload.uploadingImageKind}
          uploadProgress={imageUpload.uploadProgress}
          isSearchingAddress={addressSearch.isSearchingAddress}
          onUpdateField={invitationForm.updateField}
          onUpdatePersonField={invitationForm.updatePersonField}
          onUpdateParentField={invitationForm.updateParentField}
          onUploadImage={imageUpload.handleUploadImage}
          onRemoveSingleImage={imageUpload.handleRemoveSingleImage}
          onMoveGalleryImage={imageUpload.handleMoveGalleryImage}
          onRemoveGalleryImage={imageUpload.handleRemoveGalleryImage}
          onSearchAddress={() => addressSearch.handleSearchAddress(invitationForm.form.ceremonyAddress)}
          onOpenMapUrl={handleOpenMapUrl}
          onSetMusicEnabled={invitationForm.setMusicEnabled}
          onSetPublished={invitationForm.setPublished}
          onToggleMusicDropdown={musicLibrary.setOpenMusicDropdown}
          onSelectMusicCategory={musicLibrary.handleSelectMusicCategory}
          onSelectMusicTrack={musicLibrary.handleSelectMusicTrack}
        />

        {notice ? (
          <AppText color={palette.accent} style={manageStyles.noticeText}>
            {notice}
          </AppText>
        ) : null}
        {authError ? (
          <AppText color={palette.danger} style={manageStyles.noticeText}>
            {authError}
          </AppText>
        ) : null}

        {notice ? <AppText accessibilityRole="alert" color={palette.notice}>{notice}</AppText> : null}
        <View style={manageStyles.editorStepActions}>
          <ActionButton
            variant="secondary"
            onPress={() =>
              invitationForm.setEditorStepIndex((current) => Math.max(0, current - 1))
            }
            disabled={invitationForm.isFirstEditorStep || isEditorBusy}
          >
            이전
          </ActionButton>
          {!invitationForm.isLastEditorStep ? (
            <ActionButton
              variant="secondary"
              onPress={() =>
                invitationForm.setEditorStepIndex((current) =>
                  Math.min(EDITOR_STEPS.length - 1, current + 1)
                )
              }
              disabled={isEditorBusy}
            >
              다음
            </ActionButton>
          ) : null}
          <ActionButton
            onPress={() => void handleSaveEditor()}
            loading={invitationForm.isSaving || isEditorFinalizing}
            disabled={Boolean(imageUpload.uploadProgress)}
          >
            저장하고 확인하기
          </ActionButton>
        </View>
      </InvitationEditorModalShell>

      <GuestbookModal
        visible={guestbook.guestbookModalVisible}
        totalCount={dashboard?.commentCount ?? 0}
        filteredCount={guestbook.guestbookFilteredSortedComments.length}
        comments={guestbook.guestbookPageComments}
        searchQuery={guestbook.guestbookSearchQuery}
        page={guestbook.guestbookPage}
        totalPages={guestbook.guestbookTotalPages}
        canRefresh={canRequestDashboardSync}
        onClose={guestbook.closeGuestbookModal}
        onChangeSearchQuery={guestbook.setGuestbookSearchQuery}
        onChangePage={guestbook.setGuestbookPage}
        onHideComment={guestbook.handleHideComment}
        onScheduleDeleteComment={guestbook.handleScheduleDeleteComment}
        onRestoreComment={guestbook.handleRestoreComment}
        onRefresh={() =>
          void invitationForm.requestDashboardSync(undefined, { includeComments: true })
        }
      />

      <TicketUsageModal
        notice={notice || authError || ''}
        onBuyTickets={() => { closeTicketModal(); router.push('/create?ticketIntent=extend'); }}
        visible={ticketModalVisible}
        onClose={closeTicketModal}
        palette={palette}
        fontScale={fontScale}
        availableTicketCount={activeLinkedInvitationCard?.ticketCount ?? 0}
        isExtendingDisplayPeriod={isExtendingDisplayPeriod}
        onExtendDisplayPeriod={() => void handleExtendDisplayPeriod()}
        transferTargetCards={ticketTransferTargetCards.map((item) => ({
          slug: item.slug,
          displayName: item.displayName,
          ticketCount: item.ticketCount,
        }))}
        selectedTransferTargetSlug={selectedTicketTransferTargetCard?.slug ?? null}
        ticketTransferCount={ticketTransferCount}
        ticketTransferCountOptions={ticketTransferCountOptions}
        isTransferringTickets={isTransferringTickets}
        onSelectTransferTarget={setTicketTransferTargetSlug}
        onSelectTicketTransferCount={setTicketTransferCount}
        onTransferTickets={() => void handleTransferTicketCount()}
      />

      <InvitationEditorModalShell
        visible={Boolean(previewLinkTargetCard)}
        onClose={closePreviewLinkModal}
        title="청첩장 미리보기"
        description="공개 전에 원하는 디자인으로 내용을 확인해 주세요."
        palette={palette}
        fontScale={fontScale}
      >
        <SectionCard
          title={previewLinkTargetCard?.displayName.trim() || '연동된 청첩장'}
          description="모든 웨딩 디자인을 별도 연결 없이 디자인별 주소로 열 수 있습니다."
        >
          <BulletList
            items={[
              `기본 테마: ${
                previewLinkTargetCard
                  ? getInvitationThemeLabel(previewLinkTargetCard.defaultTheme)
                  : '-'
              }`,
              `사용 가능한 디자인: ${formatThemeList(previewLinkThemeKeys)}`,
            ]} />
          <View style={manageStyles.actionRow}>
            {previewLinkTargetCard
              ? previewLinkThemeKeys.map((themeKey) => (
                <ActionButton
                  key={`preview-link-${previewLinkTargetCard.slug}-${themeKey}`}
                  variant={themeKey === previewLinkTargetCard.defaultTheme ? 'primary' : 'secondary'}
                  onPress={() => void handleOpenThemeLink(previewLinkTargetCard, themeKey)}
                  disabled={isOpeningPreview}
                  style={manageStyles.actionHalfButton}
                >
                  {`${getInvitationThemeLabel(themeKey)} 링크 열기`}
                </ActionButton>
              ))
              : null}
          </View>
        </SectionCard>
      </InvitationEditorModalShell>

      <OnboardingModal
        visible={invitationForm.onboardingVisible}
        stepIndex={invitationForm.onboardingStepIndex}
        form={invitationForm.form}
        isSaving={invitationForm.isSaving}
        authError={authError}
        validationMessage={invitationForm.onboardingValidationMessage}
        onClose={invitationForm.closeOnboarding}
        onPrevious={() =>
          invitationForm.setOnboardingStepIndex((current) => Math.max(0, current - 1))
        }
        onNext={invitationForm.handleOnboardingNext}
        onUpdateField={invitationForm.updateField}
        onUpdatePersonName={(role, value) =>
          invitationForm.updatePersonField(role, 'name', value)
        }
        onSetPublished={invitationForm.setPublished}
      />
    </>
  );
}
