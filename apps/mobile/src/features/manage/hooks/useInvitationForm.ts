import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  MobileInvitationDashboard,
  MobileInvitationSeed,
  MobileInvitationThemeKey,
  PendingManageOnboarding,
} from '../../../types/mobileInvitation';
import { buildConfigFromForm } from '../buildConfigFromForm';
import {
  EDITOR_STEPS,
  EMPTY_FORM,
  ONBOARDING_STEPS,
  buildKakaoMapPinUrl,
  buildKakaoMapSearchUrl,
  buildManageFormFromDashboard,
  getOnboardingValidationMessage,
  hasValidCoordinates,
  parseOptionalNumber,
  type ManageFormState,
  type ManageGalleryPreviewItem,
  type ManageParentState,
  type ManageStringFieldKey,
} from '../shared';

type UseInvitationFormOptions = {
  dashboard: MobileInvitationDashboard | null;
  pendingManageOnboarding: PendingManageOnboarding | null;
  dashboardLoading: boolean;
  clearAuthError: () => void;
  clearPendingManageOnboarding: () => void;
  refreshDashboard: (options?: { includeComments?: boolean }) => Promise<boolean>;
  saveCurrentPageConfig: (
    config: MobileInvitationSeed,
    options?: {
      published?: boolean;
      defaultTheme?: MobileInvitationThemeKey;
    }
  ) => Promise<boolean>;
  setPublishedState: (published: boolean) => Promise<boolean>;
  setNotice: (message: string) => void;
};

export function useInvitationForm({
  dashboard,
  pendingManageOnboarding,
  dashboardLoading,
  clearAuthError,
  clearPendingManageOnboarding,
  refreshDashboard,
  saveCurrentPageConfig,
  setPublishedState,
  setNotice,
}: UseInvitationFormOptions) {
  const [form, setForm] = useState<ManageFormState>(EMPTY_FORM);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [editorPreparingVisible, setEditorPreparingVisible] = useState(false);
  const [editorPreparingMessage, setEditorPreparingMessage] = useState('');
  const [editorStepIndex, setEditorStepIndex] = useState(0);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const onboardingValidationMessage = useMemo(
    () => getOnboardingValidationMessage(onboardingStepIndex, form),
    [form, onboardingStepIndex]
  );

  const galleryPreviewItems = useMemo<ManageGalleryPreviewItem[]>(
    () =>
      form.galleryImages.map((originalUrl, index) => ({
        id: `${index}-${originalUrl}`,
        originalUrl,
        previewUrl: form.galleryImageThumbnailUrls[index]?.trim() || originalUrl,
      })),
    [form.galleryImageThumbnailUrls, form.galleryImages]
  );

  const previewGalleryImages = useMemo(
    () => galleryPreviewItems.map((image) => image.originalUrl),
    [galleryPreviewItems]
  );

  const coverPreviewUrl = form.coverImageThumbnailUrl.trim() || form.coverImageUrl.trim();
  const mapLatitude = parseOptionalNumber(form.kakaoLatitude);
  const mapLongitude = parseOptionalNumber(form.kakaoLongitude);
  const mapMarkerTitle =
    form.kakaoMarkerTitle.trim() ||
    form.venue.trim() ||
    form.ceremonyAddress.trim() ||
    '선택한 위치';
  const mapPreviewUrl = useMemo(() => {
    if (hasValidCoordinates(mapLatitude, mapLongitude)) {
      return buildKakaoMapPinUrl(mapMarkerTitle, mapLatitude ?? 0, mapLongitude ?? 0);
    }

    if (form.ceremonyAddress.trim()) {
      return buildKakaoMapSearchUrl(form.ceremonyAddress.trim());
    }

    return '';
  }, [form.ceremonyAddress, mapLatitude, mapLongitude, mapMarkerTitle]);

  const currentEditorStep = EDITOR_STEPS[editorStepIndex] ?? EDITOR_STEPS[0];
  const isFirstEditorStep = editorStepIndex === 0;
  const isLastEditorStep = editorStepIndex === EDITOR_STEPS.length - 1;

  useEffect(() => {
    if (!dashboard) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm(buildManageFormFromDashboard(dashboard));
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard || !pendingManageOnboarding) {
      return;
    }

    if (pendingManageOnboarding.pageSlug !== dashboard.page.slug) {
      return;
    }

    setOnboardingVisible(false);
    setOnboardingStepIndex(0);
    setEditorStepIndex(0);
    setEditorModalVisible(true);
    clearPendingManageOnboarding();
    setNotice('운영 탭의 편집 모달에서 예식 정보를 이어서 입력해 주세요.');
  }, [clearPendingManageOnboarding, dashboard, pendingManageOnboarding, setNotice]);

  const updateField = useCallback((field: ManageStringFieldKey, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const setPublished = useCallback((published: boolean) => {
    setForm((current) => ({
      ...current,
      published,
    }));
  }, []);

  const setDefaultTheme = useCallback((defaultTheme: MobileInvitationThemeKey) => {
    setForm((current) => ({
      ...current,
      defaultTheme,
    }));
  }, []);

  const setMusicEnabled = useCallback((musicEnabled: boolean) => {
    setForm((current) => ({
      ...current,
      musicEnabled,
    }));
  }, []);

  const updatePersonField = useCallback(
    (role: 'groom' | 'bride', field: 'name' | 'order' | 'phone', value: string) => {
      setForm((current) => ({
        ...current,
        [role]: {
          ...current[role],
          [field]: value,
        },
      }));
    },
    []
  );

  const updateParentField = useCallback(
    (
      role: 'groom' | 'bride',
      parent: 'father' | 'mother',
      field: keyof ManageParentState,
      value: string
    ) => {
      setForm((current) => ({
        ...current,
        [role]: {
          ...current[role],
          [parent]: {
            ...current[role][parent],
            [field]: value,
          },
        },
      }));
    },
    []
  );

  const requestDashboardSync = useCallback(
    async (nextNotice?: string, options: { includeComments?: boolean } = {}) => {
      if (dashboardLoading) {
        return false;
      }

      clearAuthError();
      if (nextNotice) {
        setNotice(nextNotice);
      }

      return refreshDashboard(options);
    },
    [clearAuthError, dashboardLoading, refreshDashboard, setNotice]
  );

  const openEditorModal = useCallback(async () => {
    if (dashboardLoading || editorModalVisible) {
      return;
    }

    clearAuthError();
    setNotice('');
    setEditorPreparingMessage(
      dashboard
        ? '청첩장 수정 화면을 준비하고 있습니다.'
        : '최신 청첩장 정보를 불러오고 있습니다.'
    );
    setEditorPreparingVisible(true);

    try {
      if (!dashboard) {
        setNotice('운영 데이터를 불러와야 편집 작업을 시작할 수 있습니다.');
        const synced = await requestDashboardSync();
        if (!synced) {
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
      setEditorStepIndex(0);
      setEditorModalVisible(true);
    } finally {
      setEditorPreparingVisible(false);
    }
  }, [
    clearAuthError,
    dashboard,
    dashboardLoading,
    editorModalVisible,
    requestDashboardSync,
    setNotice,
  ]);

  const closeEditorModal = useCallback(() => {
    setEditorModalVisible(false);
    setEditorStepIndex(0);
  }, []);

  const closeOnboarding = useCallback(() => {
    setOnboardingVisible(false);
    setOnboardingStepIndex(0);
    clearPendingManageOnboarding();
  }, [clearPendingManageOnboarding]);

  const persistForm = useCallback(
    async (options: { closeOnSuccess?: boolean; notice: string }) => {
      if (!dashboard) {
        return false;
      }

      const groomName = form.groom.name.trim();
      const brideName = form.bride.name.trim();

      if (!groomName || !brideName) {
        setNotice('신랑과 신부 이름은 비워둘 수 없습니다.');
        return false;
      }

      const nextConfig = buildConfigFromForm({ dashboard, form });

      setIsSaving(true);
      const saved = await saveCurrentPageConfig(nextConfig, {
        published: form.published,
        defaultTheme: form.defaultTheme,
      });
      setIsSaving(false);

      if (!saved) {
        return false;
      }

      setNotice(options.notice);

      if (options.closeOnSuccess) {
        closeOnboarding();
      }

      return true;
    },
    [closeOnboarding, dashboard, form, saveCurrentPageConfig, setNotice]
  );

  const handleSave = useCallback(async () => {
    const saved = await persistForm({
      notice: '운영 정보를 저장했습니다.',
    });

    if (saved) {
      closeEditorModal();
    }
  }, [closeEditorModal, persistForm]);

  const handleOnboardingNext = useCallback(async () => {
    const validationMessage = getOnboardingValidationMessage(onboardingStepIndex, form);
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    if (onboardingStepIndex === ONBOARDING_STEPS.length - 1) {
      await persistForm({
        closeOnSuccess: true,
        notice: '기본 예식 정보를 저장했습니다.',
      });
      return;
    }

    setNotice('');
    setOnboardingStepIndex((current) => current + 1);
  }, [form, onboardingStepIndex, persistForm, setNotice]);

  const handleTogglePublished = useCallback(async () => {
    if (!dashboard) {
      return;
    }

    const changed = await setPublishedState(!dashboard.page.published);
    if (changed) {
      setPublished(!dashboard.page.published);
      setNotice(
        !dashboard.page.published
          ? '페이지를 공개 상태로 전환했습니다.'
          : '페이지를 비공개 상태로 전환했습니다.'
      );
    }
  }, [dashboard, setNotice, setPublished, setPublishedState]);

  return {
    form,
    setForm,
    editorModalVisible,
    editorPreparingVisible,
    editorPreparingMessage,
    editorStepIndex,
    onboardingVisible,
    onboardingStepIndex,
    isSaving,
    onboardingValidationMessage,
    galleryPreviewItems,
    previewGalleryImages,
    coverPreviewUrl,
    mapLatitude,
    mapLongitude,
    mapMarkerTitle,
    mapPreviewUrl,
    currentEditorStep,
    isFirstEditorStep,
    isLastEditorStep,
    updateField,
    setPublished,
    setDefaultTheme,
    setMusicEnabled,
    updatePersonField,
    updateParentField,
    requestDashboardSync,
    openEditorModal,
    closeEditorModal,
    closeOnboarding,
    handleSave,
    handleOnboardingNext,
    handleTogglePublished,
    persistForm,
    setEditorStepIndex,
    setOnboardingStepIndex,
  };
}
