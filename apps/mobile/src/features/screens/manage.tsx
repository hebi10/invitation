import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, ScrollView, Share, View } from 'react-native';

import { EditorPreparingModal } from '../manage/components/EditorPreparingModal';
import { GuestbookModal } from '../manage/components/GuestbookModal';
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
import type { LinkedInvitationCard } from '../../lib/linkedInvitationCards';
import type {
  MobileDisplayPeriodSummary,
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

const THEME_LABELS: Record<MobileInvitationThemeKey, string> = {
  emotional: '감성형',
  simple: '심플형',
};

function formatThemeList(themeKeys: readonly MobileInvitationThemeKey[]) {
  return themeKeys.map((key) => THEME_LABELS[key]).join(', ');
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
}

function formatDisplayPeriod(period: MobileDisplayPeriodSummary | null | undefined) {
  if (!period?.enabled) {
    return '미설정';
  }

  const startDate = period.startDate ? formatDateLabel(period.startDate) : '시작일 미설정';
  const endDate = period.endDate ? formatDateLabel(period.endDate) : '종료일 미설정';

  return `${startDate} ~ ${endDate}`;
}

export default function ManageScreen() {
  const { apiBaseUrl, palette, fontScale } = usePreferences();
  const {
    activateStoredSession,
    authError,
    clearAuthError,
    clearPendingManageOnboarding,
    logout,
    pendingManageOnboarding,
    session,
  } = useAuth();
  const {
    dashboard,
    dashboardLoading,
    deleteComment,
    pageSummary,
    refreshDashboard,
    saveCurrentPageConfig,
    adjustTicketCount,
    extendDisplayPeriod,
    setDisplayPeriod,
    setVariantAvailability,
    setPublishedState,
    transferTicketCount,
  } = useInvitationOps();
  const [notice, setNotice] = useState('');
  const [needsRefreshRetry, setNeedsRefreshRetry] = useState(false);
  const [isEditorFinalizing, setIsEditorFinalizing] = useState(false);

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
    deleteComment,
    setNotice,
  });

  const handleCloseEditorModal = async () => {
    if (imageUpload.uploadProgress) {
      setNotice('이미지 업로드가 끝난 뒤 편집창을 닫아 주세요.');
      return;
    }

    if (isEditorFinalizing) {
      return;
    }

    setIsEditorFinalizing(true);
    try {
      const cleaned = await imageUpload.discardTrackedUploads();
      invitationForm.closeEditorModal();

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
    ticketThemeSelection,
    isExtendingDisplayPeriod,
    isApplyingTicketThemeChange,
    isApplyingExtraVariant,
    isTransferringTickets,
    ticketTransferTargetCards,
    selectedTicketTransferTargetCard,
    ticketTransferCount,
    ticketTransferCountOptions,
    upgradeTargetPlan,
    alternateTheme,
    isAlternateThemeAvailable,
    setTicketThemeSelection,
    setTicketTransferTargetSlug,
    setTicketTransferCount,
    handleOpenTicketModal,
    closeTicketModal,
    handleApplyTicketThemeChange,
    handleExtendDisplayPeriod,
    handleAddExtraVariant,
    handleTransferTicketCount,
  } = useTicketOperations({
    activeLinkedInvitationCard,
    additionalLinkedInvitationCards,
    dashboardVariants: dashboard?.page.config.variants,
    invitationForm,
    adjustTicketCount,
    extendDisplayPeriod,
    setDisplayPeriod,
    setVariantAvailability,
    transferTicketCount,
    setNotice,
    setLinkedInvitationCards,
    formatDateLabel,
  });

  const handleShare = async () => {
    const publicUrl = dashboard?.links.publicUrl;
    if (!publicUrl) {
      setNotice('공유할 공개 링크를 아직 불러오지 못했습니다.');
      return;
    }

    try {
      await Share.share({
        message: publicUrl,
        url: publicUrl,
      });
    } catch {
      setNotice('링크 공유를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleOpenUrl = async () => {
    if (!activeLinkedInvitationCard) {
      setNotice('열 수 있는 청첩장 링크를 먼저 확인해 주세요.');
      return;
    }

    try {
      if (activeLinkedInvitationCard.availableThemeKeys.length > 1) {
        openPreviewLinkModal(activeLinkedInvitationCard.slug);
        return;
      }

      const themeKey =
        activeLinkedInvitationCard.availableThemeKeys[0] ??
        activeLinkedInvitationCard.defaultTheme;
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
    const targetUrl =
      card.previewUrls[themeKey] ??
      (themeKey === card.defaultTheme ? card.publicUrl : null);

    if (!targetUrl) {
      setNotice('열 수 있는 디자인 링크를 찾지 못했습니다.');
      return;
    }

    try {
      try {
        await WebBrowser.openBrowserAsync(targetUrl, {
          enableDefaultShareMenuItem: true,
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
      setNotice('디자인 링크를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleRouteToCreateWithTicketIntent = (
    ticketIntent: 'extend' | 'extra-page' | 'extra-variant' | 'upgrade',
    options: {
      targetPlan?: MobileInvitationProductTier;
      targetTheme?: MobileInvitationThemeKey;
    } = {}
  ) => {
    closeTicketModal();
    router.push({
      pathname: '/create',
      params: {
        ticketIntent,
        ...(options.targetPlan ? { targetPlan: options.targetPlan } : {}),
        ...(options.targetTheme ? { targetTheme: options.targetTheme } : {}),
      },
    });
  };

  const handleOpenAlternateThemePreview = async () => {
    const previewUrl = dashboard?.links.previewUrls[alternateTheme];
    if (!previewUrl) {
      setNotice('다른 디자인 미리보기를 아직 불러오지 못했습니다.');
      return;
    }

    try {
      try {
        await WebBrowser.openBrowserAsync(previewUrl, {
          enableDefaultShareMenuItem: true,
          controlsColor: palette.accent,
          createTask: true,
        });
        return;
      } catch {
        // noop
      }

      await Linking.openURL(previewUrl);
    } catch {
      setNotice('다른 디자인 미리보기를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <>
      <AppScreen
        title="운영"
        subtitle="연동된 페이지의 공개 상태, 문구, 링크, 방명록을 모바일에서 바로 관리합니다."
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

        {activeLinkedInvitationCard ? (
          <SectionCard
            title="연동된 청첩장"
            description="현재 연동 정보와 공개 상태를 확인하고, 필요하면 다시 연동할 수 있습니다."
            badge={`${1 + additionalLinkedInvitationCards.length}개`}
          >
            <View
              style={[
                manageStyles.selectedInvitationCard,
                manageStyles.invitationCardExpanded,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <View style={manageStyles.invitationCardHeaderRow}>
                <AppText style={manageStyles.selectedInvitationTitle}>
                  {activeLinkedInvitationCard.displayName.trim() || '연동된 청첩장'}
                </AppText>
                <AppText color={palette.accent} variant="caption">
                  현재 연동
                </AppText>
              </View>

              <BulletList
                items={[
                  `슬러그: ${activeLinkedInvitationCard.slug}`,
                  `서비스: ${activeLinkedInvitationCard.productTier.toUpperCase()}`,
                  `기본 테마: ${activeLinkedInvitationCard.defaultTheme === 'emotional' ? '감성형' : '심플형'
                  }`,
                  `연결된 디자인: ${formatThemeList(activeLinkedInvitationCard.availableThemeKeys)}`,
                  `보유 티켓: ${activeLinkedInvitationCard.ticketCount}장`,
                  `노출 기간: ${formatDisplayPeriod(activeLinkedInvitationCard.displayPeriod)}`,
                  `배경음악: ${activeLinkedInvitationCard.showMusic ? '사용 가능' : '미제공'}`,
                  `방명록: ${activeLinkedInvitationCard.showGuestbook ? '제공' : '미제공'}`,
                ]}
              />

              {dashboard ? (
                <>
                  <AppText variant="muted" style={manageStyles.linkText}>
                    {dashboard.links.publicUrl}
                  </AppText>

                  <View style={manageStyles.actionRow}>
                    <ActionButton
                      onPress={() => void invitationForm.openEditorModal()}
                      disabled={!canRequestDashboardSync}
                      style={manageStyles.actionHalfButton}
                    >
                      수정 하기
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      onPress={handleOpenUrl}
                      style={manageStyles.actionHalfButton}
                    >
                      링크 열기
                    </ActionButton>
                    <ActionButton
                      variant={dashboard.page.published ? 'danger' : 'primary'}
                      onPress={() => void invitationForm.handleTogglePublished()}
                      style={manageStyles.actionHalfButton}
                    >
                      {dashboard.page.published ? '비공개 전환' : '공개 전환'}
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      onPress={handleOpenTicketModal}
                      style={manageStyles.actionHalfButton}
                    >
                      티켓 사용
                    </ActionButton>
                  </View>

                  <View
                    style={[
                      manageStyles.secondaryActionCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <AppText variant="caption" color={palette.textMuted} style={manageStyles.secondaryActionLabel}>
                      추가 작업
                    </AppText>
                    <View style={manageStyles.actionRow}>
                      <ActionButton
                        variant="secondary"
                        onPress={handleShare}
                        style={manageStyles.actionHalfButton}
                      >
                        링크 공유
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        onPress={guestbook.openGuestbookModal}
                        style={manageStyles.actionHalfButton}
                      >
                        방명록 열기
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        onPress={() => void handleRefreshManageScreen()}
                        disabled={!canRequestDashboardSync}
                        style={manageStyles.actionHalfButton}
                      >
                        {needsRefreshRetry ? '다시 시도' : '새로고침'}
                      </ActionButton>
                      <ActionButton
                        variant={dashboard.page.published ? 'danger' : 'primary'}
                        onPress={() => void invitationForm.handleTogglePublished()}
                        style={manageStyles.actionHalfButton}
                      >
                        {dashboard.page.published ? '비공개 전환' : '공개 전환'}
                      </ActionButton>
                    </View>
                  </View>

                  <AppText variant="muted" style={manageStyles.loadingText}>
                    {dashboard.commentCount === 0
                      ? '아직 등록된 방명록 댓글이 없습니다.'
                      : `${dashboard.commentCount}개의 방명록 댓글이 등록되어 있습니다.`}
                  </AppText>
                </>
              ) : null}
            </View>

            {additionalLinkedInvitationCards.length ? (
              <View style={manageStyles.invitationCardList}>
                {additionalLinkedInvitationCards.map((item) => (
                  <View
                    key={`linked-invitation-${item.slug}`}
                    style={[
                      manageStyles.selectedInvitationCard,
                      manageStyles.invitationCardExpanded,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <View style={manageStyles.invitationCardHeaderRow}>
                      <AppText style={manageStyles.selectedInvitationTitle}>
                        {item.displayName.trim() || item.slug}
                      </AppText>
                      <AppText variant="caption" color={palette.textMuted}>
                        추가 연동
                      </AppText>
                    </View>

                    <BulletList
                      items={[
                        `슬러그: ${item.slug}`,
                        `서비스: ${item.productTier.toUpperCase()}`,
                        `기본 테마: ${item.defaultTheme === 'emotional' ? '감성형' : '심플형'}`,
                        `연결된 디자인: ${formatThemeList(item.availableThemeKeys)}`,
                        `보유 티켓: ${item.ticketCount}장`,
                        `노출 기간: ${formatDisplayPeriod(item.displayPeriod)}`,
                      ]}
                    />

                    {item.publicUrl ? (
                      <AppText variant="muted" style={manageStyles.linkText}>
                        {item.publicUrl}
                      </AppText>
                    ) : null}

                    <View style={manageStyles.actionRow}>
                      <ActionButton
                        variant="secondary"
                        onPress={() => void handleActivateLinkedInvitation(item)}
                        loading={activatingLinkedInvitationSlug === item.slug}
                        disabled={Boolean(activatingLinkedInvitationSlug)}
                        style={manageStyles.actionHalfButton}
                      >
                        청첩장 전환하기
                      </ActionButton>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard
          title="연동 전환"
          description="현재 연동을 종료하고 다른 청첩장을 새로 연동합니다."
        >
          <ActionButton variant="secondary" onPress={() => void handleLinkAnotherInvitation()} fullWidth>
            다른 청첩장 연동하기
          </ActionButton>
        </SectionCard>
      </AppScreen>

      <EditorPreparingModal
        visible={invitationForm.editorPreparingVisible}
        message={invitationForm.editorPreparingMessage}
      />

      <InvitationEditorModalShell
        visible={invitationForm.editorModalVisible}
        onClose={() => void handleCloseEditorModal()}
        title="청첩장 정보 수정"
        description="/page-wizard처럼 단계별로 입력하면 더 편하게 관리할 수 있습니다."
        palette={palette}
        fontScale={fontScale}
        cardStyle={manageStyles.previewLinkModalCard}
        closeDisabled={isEditorBusy}
        closeLoading={isEditorFinalizing && !invitationForm.isSaving}
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
            운영 정보 저장
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
        onDeleteComment={guestbook.handleDeleteComment}
        onRefresh={() =>
          void invitationForm.requestDashboardSync(undefined, { includeComments: true })
        }
      />

      <TicketUsageModal
        visible={ticketModalVisible}
        onClose={closeTicketModal}
        palette={palette}
        fontScale={fontScale}
        availableTicketCount={activeLinkedInvitationCard?.ticketCount ?? 0}
        currentPlan={activeLinkedInvitationCard?.productTier ?? 'standard'}
        currentTheme={activeLinkedInvitationCard?.defaultTheme ?? 'emotional'}
        selectedTheme={ticketThemeSelection}
        upgradeTargetPlan={upgradeTargetPlan}
        isExtendingDisplayPeriod={isExtendingDisplayPeriod}
        isApplyingThemeChange={isApplyingTicketThemeChange}
        onSelectTheme={setTicketThemeSelection}
        onExtendDisplayPeriod={() => void handleExtendDisplayPeriod()}
        onApplyThemeChange={() => void handleApplyTicketThemeChange()}
        onOpenAlternateThemePreview={() => void handleOpenAlternateThemePreview()}
        isApplyingExtraVariant={isApplyingExtraVariant}
        isExtraVariantAdded={isAlternateThemeAvailable}
        onAddExtraVariant={() => void handleAddExtraVariant()}
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
        onGoToUpgrade={() =>
          handleRouteToCreateWithTicketIntent('upgrade', {
            targetPlan: upgradeTargetPlan ?? undefined,
          })
        }
      />

      <InvitationEditorModalShell
        visible={Boolean(previewLinkTargetCard)}
        onClose={closePreviewLinkModal}
        title="디자인 링크 열기"
        description="연결된 디자인이 여러 개면 원하는 테마 링크를 골라서 바로 열 수 있습니다."
        palette={palette}
        fontScale={fontScale}
      >
        <SectionCard
          title={previewLinkTargetCard?.displayName.trim() || '연동된 청첩장'}
          description="관리자 페이지의 디자인 미리보기처럼 현재 연결된 테마별 경로를 바로 열 수 있습니다."
        >
          <BulletList
            items={[
              `기본 테마: ${previewLinkTargetCard ? THEME_LABELS[previewLinkTargetCard.defaultTheme] : '-'}`,
              `연결된 디자인: ${formatThemeList(previewLinkThemeKeys)}`,
            ]} />
          <View style={manageStyles.actionRow}>
            {previewLinkTargetCard
              ? previewLinkThemeKeys.map((themeKey) => (
                <ActionButton
                  key={`preview-link-${previewLinkTargetCard.slug}-${themeKey}`}
                  variant={themeKey === previewLinkTargetCard.defaultTheme ? 'primary' : 'secondary'}
                  onPress={() => void handleOpenThemeLink(previewLinkTargetCard, themeKey)}
                  style={manageStyles.actionHalfButton}
                >
                  {`${THEME_LABELS[themeKey]} 링크 열기`}
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
