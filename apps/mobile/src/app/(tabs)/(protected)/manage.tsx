import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, ScrollView, Share, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppScreen } from '../../../components/AppScreen';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../../components/SectionCard';
import { useAppState } from '../../../contexts/AppStateContext';
import { EditorPreparingModal } from '../../../features/manage/components/EditorPreparingModal';
import { GuestbookModal } from '../../../features/manage/components/GuestbookModal';
import { ManageEditorStepContent } from '../../../features/manage/components/ManageEditorStepContent';
import { OnboardingModal } from '../../../features/manage/components/OnboardingModal';
import { manageStyles } from '../../../features/manage/manageStyles';
import { useAddressSearch } from '../../../features/manage/hooks/useAddressSearch';
import { useGuestbook } from '../../../features/manage/hooks/useGuestbook';
import { EDITOR_STEPS } from '../../../features/manage/shared';
import { useImageUpload } from '../../../features/manage/hooks/useImageUpload';
import { useInvitationForm } from '../../../features/manage/hooks/useInvitationForm';
import { useMusicLibrary } from '../../../features/manage/hooks/useMusicLibrary';

export default function ManageScreen() {
  const {
    apiBaseUrl,
    authError,
    clearAuthError,
    clearPendingManageOnboarding,
    dashboard,
    dashboardLoading,
    deleteComment,
    pageSummary,
    palette,
    fontScale,
    pendingManageOnboarding,
    refreshDashboard,
    saveCurrentPageConfig,
    session,
    setPublishedState,
  } = useAppState();
  const [notice, setNotice] = useState('');

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
    refreshDashboard: invitationForm.requestDashboardSync,
    deleteComment,
    setNotice,
  });

  const showDashboardSyncLoading = dashboardLoading && !dashboard && !pageSummary;
  const canRequestDashboardSync = !dashboardLoading;
  const maxGalleryImageCount = dashboard?.page.features.maxGalleryImages ?? 0;
  const supportsMusicFeature = dashboard?.page.features.showMusic ?? false;
  const selectedMusicCategoryLabel = musicLibrary.selectedMusicCategory?.label ?? '선택';

  const handleShare = async () => {
    const publicUrl = dashboard?.links.publicUrl;
    if (!publicUrl) {
      return;
    }

    await Share.share({
      message: publicUrl,
      url: publicUrl,
    });
  };

  const handleOpenUrl = async () => {
    const publicUrl = dashboard?.links.publicUrl;
    if (!publicUrl) {
      return;
    }

    await Linking.openURL(publicUrl);
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

  return (
    <>
    <AppScreen
        title="운영"
        subtitle="연동한 페이지의 공개 상태, 문구, 링크, 편집 항목, 방명록을 모바일에서 바로 관리합니다."
      >
        {showDashboardSyncLoading ? (
          <SectionCard
            onPress={canRequestDashboardSync ? () => void invitationForm.openEditorModal() : undefined}
            title="운영 데이터 불러오는 중"
            description="페이지 설정과 방명록, 공개 링크를 서버에서 확인하고 있습니다."
          >
            <View style={manageStyles.loadingRow}>
              <AppText variant="muted" style={manageStyles.loadingText}>
                운영 데이터를 동기화하는 중입니다.
              </AppText>
            </View>
          </SectionCard>
        ) : null}

        {pageSummary ? (
          <SectionCard
            onPress={canRequestDashboardSync ? () => void invitationForm.openEditorModal() : undefined}
            title={pageSummary.displayName?.trim() || '연동된 청첩장'}
            description="현재 연결된 페이지의 서비스와 공개 상태입니다."
            badge={pageSummary.published ? '공개 중' : '비공개'}
          >
            <BulletList
              items={[
                `슬러그: ${pageSummary.slug}`,
                `서비스: ${pageSummary.productTier.toUpperCase()}`,
                `기본 테마: ${pageSummary.defaultTheme === 'emotional' ? '감성형' : '심플형'}`,
                `배경음악: ${pageSummary.features.showMusic ? '사용 가능' : '미제공'}`,
                `방명록: ${pageSummary.features.showGuestbook ? '제공' : '미제공'}`,
              ]}
            />
            <View
              style={[
                manageStyles.selectedInvitationCard,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <AppText style={manageStyles.selectedInvitationTitle}>
                {pageSummary.displayName?.trim() || '연동된 청첩장'}
              </AppText>
              <AppText variant="caption" style={manageStyles.selectedInvitationHint}>
                이 청첩장을 탭해서 수정 팝업 열기
              </AppText>
            </View>
          </SectionCard>
        ) : null}

        {dashboard ? (
          <>
            <SectionCard
              title="공유와 공개 링크"
              description="실제 고객에게 공유되는 웹 링크 기준입니다."
            >
              <AppText variant="muted" style={manageStyles.linkText}>
                {dashboard.links.publicUrl}
              </AppText>
              <View style={manageStyles.actionRow}>
                <ActionButton onPress={handleShare}>링크 공유</ActionButton>
                <ActionButton variant="secondary" onPress={handleOpenUrl}>
                  링크 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() => void invitationForm.requestDashboardSync()}
                  disabled={!canRequestDashboardSync}
                >
                  새로고침
                </ActionButton>
                <ActionButton
                  variant={dashboard.page.published ? 'danger' : 'primary'}
                  onPress={() => void invitationForm.handleTogglePublished()}
                >
                  {dashboard.page.published ? '비공개 전환' : '공개 전환'}
                </ActionButton>
              </View>
            </SectionCard>

            <SectionCard
              title="청첩장 편집"
              description="선택한 청첩장을 탭하면 입력 팝업이 열리고, 그 안에서만 수정할 수 있습니다."
            >
              <View style={manageStyles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => void invitationForm.openEditorModal()}
                  disabled={!canRequestDashboardSync}
                >
                  선택한 청첩장 수정하기
                </ActionButton>
              </View>
            </SectionCard>

            <SectionCard
              title="방명록 관리"
              description="방명록 목록은 팝업에서 정렬/검색/페이지네이션으로 관리할 수 있습니다."
              badge={`${dashboard.comments.length}개`}
            >
              <AppText variant="muted" style={manageStyles.loadingText}>
                {dashboard.comments.length === 0
                  ? '아직 등록된 방명록 댓글이 없습니다.'
                  : `${dashboard.comments.length}개의 방명록이 등록되어 있습니다.`}
              </AppText>
              <View style={manageStyles.actionRow}>
                <ActionButton variant="secondary" onPress={guestbook.openGuestbookModal}>
                  방명록 팝업 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() => void invitationForm.requestDashboardSync()}
                  disabled={!canRequestDashboardSync}
                >
                  목록 새로고침
                </ActionButton>
              </View>
            </SectionCard>
          </>
        ) : null}
      </AppScreen>

      <EditorPreparingModal
        visible={invitationForm.editorPreparingVisible}
        message={invitationForm.editorPreparingMessage}
      />

      <InvitationEditorModalShell
        visible={invitationForm.editorModalVisible}
        onClose={invitationForm.closeEditorModal}
        title="청첩장 정보 수정"
        description="웹 /page-wizard/ 흐름처럼 단계별로 입력하면서 저장합니다."
        palette={palette}
        fontScale={fontScale}
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
          isSearchingAddress={addressSearch.isSearchingAddress}
          onUpdateField={invitationForm.updateField}
          onUpdatePersonField={invitationForm.updatePersonField}
          onUpdateParentField={invitationForm.updateParentField}
          onUploadImage={imageUpload.handleUploadImage}
          onMoveGalleryImage={imageUpload.handleMoveGalleryImage}
          onRemoveGalleryImage={imageUpload.handleRemoveGalleryImage}
          onSearchAddress={() => addressSearch.handleSearchAddress(invitationForm.form.ceremonyAddress)}
          onOpenMapUrl={handleOpenMapUrl}
          onSetDefaultTheme={invitationForm.setDefaultTheme}
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
            disabled={invitationForm.isFirstEditorStep}
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
            >
              다음
            </ActionButton>
          ) : null}
          <ActionButton onPress={() => void invitationForm.handleSave()} loading={invitationForm.isSaving}>
            운영 정보 저장
          </ActionButton>
        </View>
      </InvitationEditorModalShell>

      <GuestbookModal
        visible={guestbook.guestbookModalVisible}
        totalCount={dashboard?.comments.length ?? 0}
        filteredCount={guestbook.guestbookFilteredSortedComments.length}
        comments={guestbook.guestbookPageComments}
        searchQuery={guestbook.guestbookSearchQuery}
        sortKey={guestbook.guestbookSortKey}
        page={guestbook.guestbookPage}
        totalPages={guestbook.guestbookTotalPages}
        canRefresh={canRequestDashboardSync}
        onClose={guestbook.closeGuestbookModal}
        onChangeSearchQuery={guestbook.setGuestbookSearchQuery}
        onChangeSortKey={guestbook.setGuestbookSortKey}
        onChangePage={guestbook.setGuestbookPage}
        onDeleteComment={guestbook.handleDeleteComment}
        onRefresh={() => void invitationForm.requestDashboardSync()}
      />

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
