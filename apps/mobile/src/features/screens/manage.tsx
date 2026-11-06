import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import ivoryFlowers from '../../../assets/editorial/ivory-flowers.webp';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, View } from 'react-native';

import { EditorPreparingModal } from '../manage/components/EditorPreparingModal';
import { GuestbookModal } from '../manage/components/GuestbookModal';
import { LinkedInvitationsSection } from '../manage/components/LinkedInvitationsSection';
import { InvitationThemeActionList } from '../manage/components/InvitationThemeActionList';
import { ManageEditorStepContent } from '../manage/components/ManageEditorStepContent';
import { OnboardingModal } from '../manage/components/OnboardingModal';
import { PeriodExtensionModal } from '../manage/components/PeriodExtensionModal';
import { useAddressSearch } from '../manage/hooks/useAddressSearch';
import { useGuestbook } from '../manage/hooks/useGuestbook';
import { useImageUpload } from '../manage/hooks/useImageUpload';
import { useInvitationForm } from '../manage/hooks/useInvitationForm';
import { useLinkedInvitationManager } from '../manage/hooks/useLinkedInvitationManager';
import { useMusicLibrary } from '../manage/hooks/useMusicLibrary';
import { usePeriodExtensionPurchase } from '../manage/hooks/usePeriodExtensionPurchase';
import { manageStyles } from '../manage/manageStyles';
import { EDITOR_STEPS } from '../manage/shared';
import { AccountInvitationsSection } from '../../components/AccountInvitationsSection';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { ModalFeedback } from '../../components/ModalPrimitives';
import { BulletList } from '../../components/BulletList';
import { DraftInvitationsSection } from '../../components/DraftInvitationsSection';
import { InvitationEditorModalShell } from '../../components/manage/InvitationEditorModalShell';
import { InvitationEditorWorkspace } from '../../components/manage/InvitationEditorWorkspace';
import { SectionCard } from '../../components/SectionCard';
import { useAuth } from '../../contexts/AuthContext';
import { useDrafts } from '../../contexts/DraftsContext';
import { useInvitationOps } from '../../contexts/InvitationOpsContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import {
  issueMobileClientEditorLinkToken,
  revokeMobileClientEditorLinkTokens,
} from '../../lib/api';
import { buildManageAppDeepLink } from '../../lib/appDeepLink';
import {
  getLinkedInvitationThemeKeys,
  type LinkedInvitationCard,
} from '../../lib/linkedInvitationCards';
import { copyTextWithFallback } from '../../lib/textTransfer';
import { createPrivatePreviewUrl } from '../../lib/apiPreview';
import type { WeddingIntroStyle } from '../../lib/weddingIntro';
import { buildMobileKakaoShareTarget } from '../../lib/invitationSharing';
import type {
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

export default function ManageScreen() {
  const { apiBaseUrl, palette, fontScale } = usePreferences();
  const { drafts, isReady: draftsReady } = useDrafts();
  const {
    activateStoredSession,
    authError,
    clearAuthError,
    clearPendingManageOnboarding,
    customerSession,
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
    setPublishedState,
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
  const [kakaoShareTargetCard, setKakaoShareTargetCard] = useState<LinkedInvitationCard | null>(null);
  const [isOpeningKakaoShare, setIsOpeningKakaoShare] = useState(false);

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

  const handleSaveEditor = async ({ close = true, advance = false, applyPublicationChange = true } = {}) => {
    Keyboard.dismiss();
    if (imageUpload.uploadProgress) {
      setNotice('이미지 업로드가 끝난 뒤 저장해 주세요.');
      return false;
    }

    if (invitationForm.isSaving || isEditorFinalizing) {
      return false;
    }

    setIsEditorFinalizing(true);
    try {
      const saved = await invitationForm.persistForm({
        notice: '운영 정보를 저장했습니다.',
        suppressNotice: true,
        applyPublicationChange,
      });

      if (!saved) {
        return false;
      }

      const cleaned = await imageUpload.finalizeTrackedUploads(invitationForm.form);
      if (close) {
        invitationForm.closeEditorModal();
        setConfirmDiscard(false);
        setSavedNextSteps(true);
      } else if (advance) {
        invitationForm.setEditorStepIndex(current => Math.min(EDITOR_STEPS.length - 1, current + 1));
      }
      setNotice(
        cleaned
          ? '운영 정보를 저장했습니다.'
          : '운영 정보는 저장했지만 임시 업로드 이미지를 정리하지 못했습니다. 잠시 후 다시 확인해 주세요.'
      );
      return true;
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
    extensionModalVisible,
    isPurchasingExtension,
    pendingExtensionSlug,
    isRecoveringExtension,
    openExtensionModal,
    closeExtensionModal,
    handlePurchaseExtension,
    handleRecoverExtension,
  } = usePeriodExtensionPurchase({
    activeLinkedInvitationCard,
    refreshDashboard,
    setNotice,
  });

  const handlePreviewIntro = async (style: WeddingIntroStyle) => {
    try {
      const url = new URL('/mobile-intro-preview/', apiBaseUrl);
      url.searchParams.set('style', style);
      await WebBrowser.openBrowserAsync(url.toString(), { controlsColor: palette.accent });
    } catch {
      setNotice('첫 화면 연출을 열지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.');
    }
  };

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

  const handleOpenKakaoShare = (card: LinkedInvitationCard) => {
    const targetCard = card.slug === session?.pageSlug && pageSummary
      ? { ...card, published: pageSummary.published, displayPeriod: pageSummary.displayPeriod }
      : card;
    const theme = getLinkedInvitationThemeKeys(targetCard)[0] ?? targetCard.defaultTheme;
    const target = buildMobileKakaoShareTarget(apiBaseUrl, targetCard, theme);
    if (!target.url) {
      setNotice(target.notice);
      return;
    }
    setKakaoShareTargetCard(targetCard);
  };

  const handleShareTheme = async (card: LinkedInvitationCard, theme: MobileInvitationThemeKey) => {
    if (isOpeningKakaoShare) return;
    const target = buildMobileKakaoShareTarget(apiBaseUrl, card, theme);
    if (!target.url) {
      setNotice(target.notice);
      setKakaoShareTargetCard(null);
      return;
    }
    setIsOpeningKakaoShare(true);
    try {
      try {
        await WebBrowser.openBrowserAsync(target.url, {
          enableDefaultShareMenuItem: false,
          controlsColor: palette.accent,
          createTask: true,
        });
      } catch {
        await Linking.openURL(target.url);
      }
      setKakaoShareTargetCard(null);
    } catch {
      setNotice('카카오톡 공유 화면을 열지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setIsOpeningKakaoShare(false);
    }
  };

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
        title="내 청첩장"
        subtitle="청첩장 내용을 수정하고 공개·공유 상태를 확인하세요."
      >
        {showDashboardSyncLoading ? (
          <SectionCard
            onPress={canRequestDashboardSync ? () => void invitationForm.openEditorModal() : undefined}
            title="운영 데이터를 불러오는 중"
            description="페이지 설정과 방명록, 공개 링크를 서버에서 확인하고 있습니다."
          >
            <View style={manageStyles.loadingRow} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={palette.accent} />
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
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText color={palette.textMuted} accessibilityLiveRegion="polite" style={manageStyles.noticeText}>
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
            <AppText color={palette.danger} accessibilityRole="alert" style={manageStyles.noticeText}>
              {authError}
            </AppText>
          </View>
        ) : null}

        {savedNextSteps && dashboard ? <SectionCard title="내용을 저장했습니다."
          description="저장된 내용을 미리보기에서 확인한 뒤 하객에게 공유하세요.">
          <ActionButton variant="secondary" loading={isOpeningPreview} onPress={handleOpenUrl}>저장 결과 미리보기</ActionButton>
        </SectionCard> : null}

        <LinkedInvitationsSection
          activeLinkedInvitationCard={activeLinkedInvitationCard}
          additionalLinkedInvitationCards={additionalLinkedInvitationCards}
          palette={palette}
          hasDashboard={Boolean(dashboard)}
          dashboardPublicUrl={dashboard?.links.publicUrl ?? null}
          dashboardCommentCount={dashboard?.commentCount ?? 0}
          dashboardPublished={dashboard?.page.published ?? false}
          dashboardWeddingDate={dashboard?.page.config.date}
          dashboardCoverImageUrl={dashboard?.page.config.pageData?.coverImageThumbnailUrl || dashboard?.page.config.metadata?.images?.wedding || null}
          canRequestDashboardSync={canRequestDashboardSync}
          needsRefreshRetry={needsRefreshRetry}
          activatingLinkedInvitationSlug={activatingLinkedInvitationSlug}
          onOpenEditor={() => void invitationForm.openEditorModal()}
          onOpenUrl={handleOpenUrl}
          onTogglePublished={() => void invitationForm.handleTogglePublished()}
          onOpenPeriodExtension={openExtensionModal}
          onCopyPublicUrl={(card) => void handleCopyPublicUrl(card)}
          onKakaoShare={handleOpenKakaoShare}
          onOpenInApp={() => void handleOpenInApp()}
          onOpenGuestbook={guestbook.openGuestbookModal}
          onRefresh={() => void handleRefreshManageScreen()}
          onActivateLinkedInvitation={(card) => void handleActivateLinkedInvitation(card)}
        />

        {!showDashboardSyncLoading && !activeLinkedInvitationCard && draftsReady && drafts.length === 0 ? (
          <SectionCard
            title="이 기기에 연결된 청첩장이 없습니다"
            description="고객 계정에서 기존 청첩장을 불러오거나 새 청첩장을 만들어 보세요."
          >
            <Image
              source={ivoryFlowers}
              contentFit="cover"
              style={manageStyles.emptyIllustration}
              alt="아이보리 웨딩 꽃 장식"
            />
            <ActionButton fullWidth onPress={() => router.push('/create')}>
              새 청첩장 만들기
            </ActionButton>
          </SectionCard>
        ) : null}

        <AccountInvitationsSection />

        <DraftInvitationsSection />

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

      <InvitationEditorWorkspace
        visible={invitationForm.editorModalVisible}
        onClose={() => void handleCloseEditorModal()}
        title={invitationForm.currentEditorStep.title}
        description={invitationForm.currentEditorStep.description}
        status={invitationForm.isSaving || isEditorFinalizing ? '저장 중' : invitationForm.saveFailed
          ? '저장 실패 · 입력은 유지됩니다' : invitationForm.isFormDirty ? '변경사항 있음' : '저장됨'}
        statusTone={invitationForm.saveFailed ? 'danger' : isEditorBusy || invitationForm.isFormDirty ? 'notice' : 'success'}
        publicationLabel={`현재 저장 상태 · ${invitationForm.savedPublished ? '공개 설정' : '비공개 설정'}`}
        steps={EDITOR_STEPS}
        activeStepIndex={invitationForm.editorStepIndex}
        onSelectStep={invitationForm.setEditorStepIndex}
        onPreview={() => {
          if (invitationForm.isFormDirty) {
            setNotice('미리보기는 저장된 내용을 보여줍니다. 먼저 내용을 저장해 주세요.');
            return;
          }
          if (activeLinkedInvitationCard) void handleOpenThemeLink(activeLinkedInvitationCard, invitationForm.form.defaultTheme);
        }}
        busy={isEditorBusy || isOpeningPreview}
        compactFooter={<ActionButton fullWidth loading={isEditorBusy}
          onPress={() => void handleSaveEditor({ close: false, applyPublicationChange: false })}>내용 저장</ActionButton>}
        confirmation={confirmDiscard ? <View style={{ gap: 8 }}>
          <ModalFeedback palette={palette} tone="notice">
            저장하지 않은 변경사항이 있습니다. 공개 설정 변경은 최종 단계에서 적용합니다.
          </ModalFeedback>
          <ActionButton onPress={() => void handleSaveEditor({ applyPublicationChange: false })} loading={isEditorBusy} fullWidth>
            내용 저장 후 닫기
          </ActionButton>
          <ActionButton variant="secondary" onPress={() => setConfirmDiscard(false)} disabled={isEditorBusy} fullWidth>
            계속 편집
          </ActionButton>
          <ActionButton variant="danger" disabled={isEditorBusy} onPress={() => void handleCloseEditorModal(true)} fullWidth>
            변경 취소하고 닫기
          </ActionButton>
        </View> : undefined}
        footer={<>
          <View style={manageStyles.actionRow}>
            <ActionButton variant="secondary" disabled={invitationForm.isFirstEditorStep || isEditorBusy}
              onPress={() => invitationForm.setEditorStepIndex(current => Math.max(0, current - 1))}>이전</ActionButton>
            {!invitationForm.isLastEditorStep ? <ActionButton variant="secondary" disabled={isEditorBusy}
              onPress={() => void handleSaveEditor({ close: false, applyPublicationChange: false })}>내용 저장</ActionButton> : null}
            <ActionButton loading={isEditorBusy} style={{ flexGrow: 1 }}
              onPress={() => void handleSaveEditor(invitationForm.isLastEditorStep
                ? {} : { close: false, advance: true, applyPublicationChange: false })}>
              {invitationForm.isLastEditorStep
                ? invitationForm.form.published !== invitationForm.savedPublished
                  ? invitationForm.form.published ? '저장 후 공개' : '비공개로 저장'
                  : '저장 완료'
                : '저장 후 다음'}
            </ActionButton>
          </View>
          <AppText variant="caption" color={palette.textMuted}>내용 저장은 현재 공개 상태를 유지합니다.</AppText>
        </>}
      >
        <ManageEditorStepContent
          stepKey={invitationForm.currentEditorStep.key}
          form={invitationForm.form}
          savedPublished={invitationForm.savedPublished}
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
          onSetIntroStyle={invitationForm.setIntroStyle}
          onPreviewIntro={(style) => void handlePreviewIntro(style)}
          onToggleMusicDropdown={musicLibrary.setOpenMusicDropdown}
          onSelectMusicCategory={musicLibrary.handleSelectMusicCategory}
          onSelectMusicTrack={musicLibrary.handleSelectMusicTrack}
        />
        {notice ? <AppText accessibilityRole="alert" color={invitationForm.saveFailed ? palette.danger : palette.textMuted}>{notice}</AppText> : null}
        {authError ? <AppText accessibilityRole="alert" color={palette.danger}>{authError}</AppText> : null}
      </InvitationEditorWorkspace>

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

      <PeriodExtensionModal
        visible={extensionModalVisible}
        onClose={closeExtensionModal}
        palette={palette}
        fontScale={fontScale}
        targetName={activeLinkedInvitationCard?.displayName || activeLinkedInvitationCard?.slug || '청첩장'}
        customerAuthenticated={Boolean(customerSession)}
        loading={isPurchasingExtension}
        recovering={isRecoveringExtension}
        pendingTargetSlug={pendingExtensionSlug}
        currentPageSlug={activeLinkedInvitationCard?.slug ?? null}
        onPurchase={() => void handlePurchaseExtension()}
        onRecover={() => void handleRecoverExtension()}
      />

      <InvitationEditorModalShell
        visible={Boolean(previewLinkTargetCard)}
        onClose={closePreviewLinkModal}
        title="청첩장 미리보기"
        description="디자인을 선택해 실제 청첩장 내용을 확인해 주세요."
        closeDisabled={isOpeningPreview}
        palette={palette}
        fontScale={fontScale}
      >
        <AppText variant="title">
          {previewLinkTargetCard?.displayName.trim() || '연동된 청첩장'}
        </AppText>
        <InvitationThemeActionList
          themes={previewLinkThemeKeys}
          currentTheme={previewLinkTargetCard?.defaultTheme}
          action="preview"
          busy={isOpeningPreview}
          onSelect={(theme) => {
            if (previewLinkTargetCard) void handleOpenThemeLink(previewLinkTargetCard, theme);
          }}
        />
      </InvitationEditorModalShell>

      <InvitationEditorModalShell
        visible={Boolean(kakaoShareTargetCard)}
        onClose={() => setKakaoShareTargetCard(null)}
        title="카카오톡 카드 공유"
        description="공유할 디자인을 선택해 하객에게 청첩장을 전달해 주세요."
        closeDisabled={isOpeningKakaoShare}
        palette={palette}
        fontScale={fontScale}
      >
        <AppText variant="title">
          {kakaoShareTargetCard?.displayName.trim() || '청첩장 공유'}
        </AppText>
        <InvitationThemeActionList
          themes={kakaoShareTargetCard ? getLinkedInvitationThemeKeys(kakaoShareTargetCard) : []}
          currentTheme={kakaoShareTargetCard?.defaultTheme}
          action="share"
          busy={isOpeningKakaoShare}
          onSelect={(theme) => {
            if (kakaoShareTargetCard) void handleShareTheme(kakaoShareTargetCard, theme);
          }}
        />
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
