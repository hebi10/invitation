import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { BulletList } from '../../components/BulletList';
import { LoginCard } from '../../components/LoginCard';
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { useAppState } from '../../contexts/AppStateContext';

type ManageFormState = {
  displayName: string;
  description: string;
  groomName: string;
  brideName: string;
  date: string;
  venue: string;
  ceremonyAddress: string;
  ceremonyContact: string;
  greetingMessage: string;
  musicEnabled: boolean;
  published: boolean;
};

const ONBOARDING_STEPS = [
  {
    key: 'cover',
    title: '1. 기본 문구와 이름',
    description: '대표 제목과 소개 문구, 신랑·신부 이름을 먼저 확인합니다.',
  },
  {
    key: 'schedule',
    title: '2. 예식 일정과 장소',
    description: '예식 일시와 장소, 상세 주소를 넣어 공개 페이지의 기본 정보를 채웁니다.',
  },
  {
    key: 'greeting',
    title: '3. 인사말과 공개 상태',
    description: '인사말을 입력하고, 저장 직후 공개 여부를 함께 결정합니다.',
  },
] as const;

const EMPTY_FORM: ManageFormState = {
  displayName: '',
  description: '',
  groomName: '',
  brideName: '',
  date: '',
  venue: '',
  ceremonyAddress: '',
  ceremonyContact: '',
  greetingMessage: '',
  musicEnabled: false,
  published: false,
};

function getOnboardingValidationMessage(stepIndex: number, form: ManageFormState) {
  if (stepIndex === 0) {
    if (!form.groomName.trim()) {
      return '신랑 이름을 입력해 주세요.';
    }

    if (!form.brideName.trim()) {
      return '신부 이름을 입력해 주세요.';
    }

    if (!form.displayName.trim()) {
      return '대표 제목을 입력해 주세요.';
    }
  }

  if (stepIndex === 1) {
    if (!form.date.trim()) {
      return '예식 일시를 입력해 주세요.';
    }

    if (!form.venue.trim()) {
      return '예식 장소를 입력해 주세요.';
    }

    if (!form.ceremonyAddress.trim()) {
      return '예식장 상세 주소를 입력해 주세요.';
    }
  }

  if (stepIndex === 2 && !form.greetingMessage.trim()) {
    return '인사말을 입력해 주세요.';
  }

  return null;
}

export default function ManageScreen() {
  const {
    authError,
    clearAuthError,
    clearPendingManageOnboarding,
    dashboard,
    dashboardLoading,
    deleteComment,
    isAuthenticated,
    isBootstrapping,
    login,
    pageSummary,
    palette,
    fontScale,
    pendingManageOnboarding,
    refreshDashboard,
    saveCurrentPageConfig,
    setPublishedState,
  } = useAppState();

  const [pageIdentifier, setPageIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<ManageFormState>(EMPTY_FORM);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const onboardingValidationMessage = useMemo(
    () => getOnboardingValidationMessage(onboardingStepIndex, form),
    [form, onboardingStepIndex]
  );

  useEffect(() => {
    if (!dashboard) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      displayName: dashboard.page.config.displayName ?? '',
      description: dashboard.page.config.description ?? '',
      groomName:
        dashboard.page.config.couple?.groom?.name ??
        dashboard.page.config.groomName ??
        '',
      brideName:
        dashboard.page.config.couple?.bride?.name ??
        dashboard.page.config.brideName ??
        '',
      date: dashboard.page.config.date ?? '',
      venue: dashboard.page.config.venue ?? '',
      ceremonyAddress:
        typeof dashboard.page.config.pageData?.ceremonyAddress === 'string'
          ? dashboard.page.config.pageData.ceremonyAddress
          : '',
      ceremonyContact:
        typeof dashboard.page.config.pageData?.ceremonyContact === 'string'
          ? dashboard.page.config.pageData.ceremonyContact
          : '',
      greetingMessage:
        typeof dashboard.page.config.pageData?.greetingMessage === 'string'
          ? dashboard.page.config.pageData.greetingMessage
          : '',
      musicEnabled: dashboard.page.features.showMusic
        ? dashboard.page.config.musicEnabled === true
        : false,
      published: dashboard.page.published,
    });
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard || !pendingManageOnboarding) {
      return;
    }

    if (pendingManageOnboarding.pageSlug !== dashboard.page.slug) {
      return;
    }

    setOnboardingStepIndex(0);
    setOnboardingVisible(true);
    setNotice('운영 탭에서 예식 정보를 이어서 입력해 주세요.');
  }, [dashboard, pendingManageOnboarding]);

  const handleLogin = async () => {
    clearAuthError();
    const authenticated = await login(pageIdentifier, password);
    if (authenticated) {
      setPassword('');
      setNotice('');
    }
  };

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

  const closeOnboarding = () => {
    setOnboardingVisible(false);
    setOnboardingStepIndex(0);
    clearPendingManageOnboarding();
  };

  const persistForm = async (options: { closeOnSuccess?: boolean; notice: string }) => {
    if (!dashboard) {
      return false;
    }

    const groomName = form.groomName.trim();
    const brideName = form.brideName.trim();
    if (!groomName || !brideName) {
      setNotice('신랑/신부 이름은 비워둘 수 없습니다.');
      return false;
    }

    const nextConfig = {
      ...dashboard.page.config,
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      date: form.date.trim(),
      venue: form.venue.trim(),
      groomName,
      brideName,
      musicEnabled: dashboard.page.features.showMusic ? form.musicEnabled : false,
      couple: {
        ...dashboard.page.config.couple,
        groom: {
          ...dashboard.page.config.couple.groom,
          name: groomName,
        },
        bride: {
          ...dashboard.page.config.couple.bride,
          name: brideName,
        },
      },
      pageData: {
        ...(dashboard.page.config.pageData ?? {}),
        greetingMessage: form.greetingMessage.trim(),
        venueName: form.venue.trim(),
        ceremonyAddress: form.ceremonyAddress.trim(),
        ceremonyContact: form.ceremonyContact.trim(),
        ceremonyTime: form.date.trim(),
        ceremony: {
          ...(dashboard.page.config.pageData?.ceremony ?? {}),
          time: form.date.trim(),
          location: form.venue.trim(),
        },
      },
    };

    setIsSaving(true);

    const saved = await saveCurrentPageConfig(nextConfig, {
      published: form.published,
      defaultTheme: dashboard.page.defaultTheme,
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
  };

  const handleSave = async () => {
    await persistForm({
      notice: '운영 정보를 저장했습니다.',
    });
  };

  const handleOnboardingNext = async () => {
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
  };

  const handleTogglePublished = async () => {
    if (!dashboard) {
      return;
    }

    const changed = await setPublishedState(!dashboard.page.published);
    if (changed) {
      setForm((current) => ({
        ...current,
        published: !dashboard.page.published,
      }));
      setNotice(
        !dashboard.page.published
          ? '페이지를 공개 상태로 전환했습니다.'
          : '페이지를 비공개 상태로 전환했습니다.'
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const deleted = await deleteComment(commentId);
    if (deleted) {
      setNotice('방명록 댓글을 삭제했습니다.');
    }
  };

  const renderOnboardingStep = () => {
    switch (onboardingStepIndex) {
      case 0:
        return (
          <>
            <TextField
              label="대표 제목"
              value={form.displayName}
              onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))}
              placeholder="예: 신민제 · 김현지 결혼합니다"
            />
            <TextField
              label="소개 문구"
              value={form.description}
              onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
              placeholder="청첩장 첫 화면에 노출할 문구"
              multiline
            />
            <TextField
              label="신랑 이름"
              value={form.groomName}
              onChangeText={(value) => setForm((current) => ({ ...current, groomName: value }))}
              placeholder="예: 신민제"
            />
            <TextField
              label="신부 이름"
              value={form.brideName}
              onChangeText={(value) => setForm((current) => ({ ...current, brideName: value }))}
              placeholder="예: 김현지"
            />
          </>
        );
      case 1:
        return (
          <>
            <TextField
              label="예식 일시"
              value={form.date}
              onChangeText={(value) => setForm((current) => ({ ...current, date: value }))}
              placeholder="예: 2026.07.12 오후 2시"
            />
            <TextField
              label="예식 장소"
              value={form.venue}
              onChangeText={(value) => setForm((current) => ({ ...current, venue: value }))}
              placeholder="예: 더컨벤션 서울"
            />
            <TextField
              label="상세 주소"
              value={form.ceremonyAddress}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, ceremonyAddress: value }))
              }
              placeholder="예: 서울시 강남구 ..."
              multiline
            />
            <TextField
              label="예식장 연락처"
              value={form.ceremonyContact}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, ceremonyContact: value }))
              }
              placeholder="예: 02-1234-5678"
              autoCapitalize="none"
            />
          </>
        );
      default:
        return (
          <>
            <TextField
              label="인사말"
              value={form.greetingMessage}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, greetingMessage: value }))
              }
              placeholder="전하고 싶은 인사말을 입력하세요."
              multiline
            />
            {dashboard?.page.features.showMusic ? (
              <ActionButton
                variant={form.musicEnabled ? 'primary' : 'secondary'}
                onPress={() =>
                  setForm((current) => ({ ...current, musicEnabled: !current.musicEnabled }))
                }
                fullWidth
              >
                {form.musicEnabled ? '배경음악 사용 중' : '배경음악 사용 안 함'}
              </ActionButton>
            ) : null}
            <ActionButton
              variant={form.published ? 'primary' : 'secondary'}
              onPress={() =>
                setForm((current) => ({ ...current, published: !current.published }))
              }
              fullWidth
            >
              {form.published ? '저장 후 공개' : '저장 후 비공개 유지'}
            </ActionButton>
          </>
        );
    }
  };

  return (
    <>
      <AppScreen
        title="운영"
        subtitle="로그인한 페이지의 공개 상태, 문구, 링크, 방명록을 모바일에서 바로 관리합니다."
      >
        {!isAuthenticated ? (
          <LoginCard
            pageIdentifier={pageIdentifier}
            password={password}
            onChangePageIdentifier={setPageIdentifier}
            onChangePassword={setPassword}
            onSubmit={handleLogin}
          />
        ) : null}

        {isBootstrapping || dashboardLoading ? (
          <SectionCard
            title="운영 데이터 불러오는 중"
            description="페이지 설정과 방명록, 공개 링크를 서버에서 확인하고 있습니다."
          >
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.loadingText, { color: palette.textMuted, fontSize: 14 * fontScale }]}>
                운영 데이터를 동기화하는 중입니다.
              </Text>
            </View>
          </SectionCard>
        ) : null}

        {pageSummary ? (
          <SectionCard
            title={pageSummary.displayName?.trim() || '로그인된 청첩장'}
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
          </SectionCard>
        ) : null}

        {dashboard ? (
          <>
            <SectionCard
              title="공유와 공개 링크"
              description="실제 고객에게 공유되는 웹 링크 기준입니다."
            >
              <Text style={[styles.linkText, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                {dashboard.links.publicUrl}
              </Text>
              <View style={styles.actionRow}>
                <ActionButton onPress={handleShare}>링크 공유</ActionButton>
                <ActionButton variant="secondary" onPress={handleOpenUrl}>
                  링크 열기
                </ActionButton>
                <ActionButton variant="secondary" onPress={() => void refreshDashboard()}>
                  새로고침
                </ActionButton>
                <ActionButton
                  variant={dashboard.page.published ? 'danger' : 'primary'}
                  onPress={handleTogglePublished}
                >
                  {dashboard.page.published ? '비공개 전환' : '공개 전환'}
                </ActionButton>
              </View>
            </SectionCard>

            <SectionCard
              title="핵심 문구와 일정 편집"
              description="생성 직후 팝업에서 입력한 정보는 여기서 계속 수정할 수 있습니다."
            >
              <TextField
                label="대표 제목"
                value={form.displayName}
                onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))}
                placeholder="예: 신민제 · 김현지 결혼합니다"
              />
              <TextField
                label="소개 문구"
                value={form.description}
                onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                placeholder="청첩장 소개 문구"
                multiline
              />
              <TextField
                label="신랑 이름"
                value={form.groomName}
                onChangeText={(value) => setForm((current) => ({ ...current, groomName: value }))}
                placeholder="예: 신민제"
              />
              <TextField
                label="신부 이름"
                value={form.brideName}
                onChangeText={(value) => setForm((current) => ({ ...current, brideName: value }))}
                placeholder="예: 김현지"
              />
              <TextField
                label="예식 일시"
                value={form.date}
                onChangeText={(value) => setForm((current) => ({ ...current, date: value }))}
                placeholder="예: 2026.07.12 오후 2시"
              />
              <TextField
                label="예식 장소"
                value={form.venue}
                onChangeText={(value) => setForm((current) => ({ ...current, venue: value }))}
                placeholder="예: 더컨벤션 서울"
              />
              <TextField
                label="상세 주소"
                value={form.ceremonyAddress}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, ceremonyAddress: value }))
                }
                placeholder="예: 서울시 강남구 ..."
                multiline
              />
              <TextField
                label="예식장 연락처"
                value={form.ceremonyContact}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, ceremonyContact: value }))
                }
                placeholder="예: 02-1234-5678"
                autoCapitalize="none"
              />
              <TextField
                label="인사말"
                value={form.greetingMessage}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, greetingMessage: value }))
                }
                placeholder="전하고 싶은 인사말을 입력하세요."
                multiline
              />
              {dashboard.page.features.showMusic ? (
                <ActionButton
                  variant={form.musicEnabled ? 'primary' : 'secondary'}
                  onPress={() =>
                    setForm((current) => ({ ...current, musicEnabled: !current.musicEnabled }))
                  }
                >
                  {form.musicEnabled ? '배경음악 사용 중' : '배경음악 사용 안 함'}
                </ActionButton>
              ) : null}
              {notice ? (
                <Text style={[styles.noticeText, { color: palette.accent, fontSize: 13 * fontScale }]}>
                  {notice}
                </Text>
              ) : null}
              {authError ? (
                <Text style={[styles.noticeText, { color: palette.danger, fontSize: 13 * fontScale }]}>
                  {authError}
                </Text>
              ) : null}
              <ActionButton
                onPress={() => void handleSave()}
                loading={isSaving}
                fullWidth
              >
                운영 정보 저장
              </ActionButton>
            </SectionCard>

            <SectionCard
              title="방명록 관리"
              description="최근 댓글을 바로 확인하고 부적절한 댓글은 삭제할 수 있습니다."
              badge={`${dashboard.comments.length}개`}
            >
              {dashboard.comments.length === 0 ? (
                <Text style={[styles.loadingText, { color: palette.textMuted, fontSize: 14 * fontScale }]}>
                  아직 등록된 방명록 댓글이 없습니다.
                </Text>
              ) : (
                dashboard.comments.map((comment) => (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentCard,
                      { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
                    ]}
                  >
                    <View style={styles.commentCopy}>
                      <Text style={[styles.commentAuthor, { color: palette.text, fontSize: 15 * fontScale }]}>
                        {comment.author}
                      </Text>
                      <Text style={[styles.commentMessage, { color: palette.textMuted, fontSize: 14 * fontScale }]}>
                        {comment.message}
                      </Text>
                      <Text style={[styles.commentMeta, { color: palette.textMuted, fontSize: 12 * fontScale }]}>
                        {comment.createdAt
                          ? new Date(comment.createdAt).toLocaleString('ko-KR')
                          : '작성 시각 없음'}
                      </Text>
                    </View>
                    <ActionButton variant="danger" onPress={() => void handleDeleteComment(comment.id)}>
                      삭제
                    </ActionButton>
                  </View>
                ))
              )}
            </SectionCard>
          </>
        ) : null}
      </AppScreen>

      <Modal
        visible={onboardingVisible}
        animationType="slide"
        transparent
        onRequestClose={closeOnboarding}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeOnboarding} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalEyebrow, { color: palette.accent, fontSize: 12 * fontScale }]}>
                  운영 탭 온보딩
                </Text>
                <Text style={[styles.modalTitle, { color: palette.text, fontSize: 22 * fontScale }]}>
                  {ONBOARDING_STEPS[onboardingStepIndex].title}
                </Text>
                <Text
                  style={[
                    styles.modalDescription,
                    { color: palette.textMuted, fontSize: 14 * fontScale },
                  ]}
                >
                  {ONBOARDING_STEPS[onboardingStepIndex].description}
                </Text>
              </View>
              <View style={[styles.modalBadge, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.modalBadgeText, { color: palette.accent, fontSize: 12 * fontScale }]}>
                  {onboardingStepIndex + 1} / {ONBOARDING_STEPS.length}
                </Text>
              </View>
            </View>

            {renderOnboardingStep()}

            {onboardingValidationMessage ? (
              <Text style={[styles.modalErrorText, { color: palette.danger, fontSize: 13 * fontScale }]}>
                {onboardingValidationMessage}
              </Text>
            ) : null}
            {authError ? (
              <Text style={[styles.modalErrorText, { color: palette.danger, fontSize: 13 * fontScale }]}>
                {authError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <ActionButton variant="secondary" onPress={closeOnboarding}>
                나중에 입력
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={() => setOnboardingStepIndex((current) => Math.max(0, current - 1))}
                disabled={onboardingStepIndex === 0}
              >
                이전
              </ActionButton>
              <ActionButton
                onPress={() => void handleOnboardingNext()}
                loading={isSaving}
              >
                {onboardingStepIndex === ONBOARDING_STEPS.length - 1 ? '저장 후 시작' : '다음'}
              </ActionButton>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    lineHeight: 20,
  },
  linkText: {
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noticeText: {
    lineHeight: 20,
  },
  commentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  commentCopy: {
    gap: 4,
  },
  commentAuthor: {
    fontWeight: '700',
  },
  commentMessage: {
    lineHeight: 20,
  },
  commentMeta: {
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 12, 10, 0.58)',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  modalEyebrow: {
    fontWeight: '800',
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalDescription: {
    lineHeight: 21,
  },
  modalBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalBadgeText: {
    fontWeight: '800',
  },
  modalErrorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
});
