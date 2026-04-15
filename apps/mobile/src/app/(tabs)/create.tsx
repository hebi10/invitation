import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { ChoiceChip } from '../../components/ChoiceChip';
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { useAppState } from '../../contexts/AppStateContext';
import {
  designThemes,
  servicePlans,
} from '../../constants/content';
import { formatPrice } from '../../lib/format';
import {
  buildPageSlugBaseFromEnglishNames,
  isValidEnglishName,
} from '../../lib/pageSlug';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

const FLOW_GUIDE_ITEMS = [
  '신랑·신부 한글 이름, 영문 이름, 페이지 비밀번호를 먼저 확인합니다.',
  '서비스와 디자인을 선택하고, 필요한 경우 추가 티켓 수량을 정합니다.',
  '결제 확인 팝업을 거친 뒤 바로 페이지를 생성하고 운영 탭으로 이동합니다.',
] as const;

const TICKET_USAGE_ITEMS = [
  '티켓 1장: 1개월 연장',
  '티켓 1장: 디자인 변경',
  '티켓 1장: 모바일 청첩장 1개 추가 생성',
  '티켓 2장: 같은 청첩장에 다른 디자인 추가',
  '티켓 2장: 서비스 업그레이드',
] as const;

const TICKET_UNIT_PRICE = 5000;
const TICKET_DISCOUNT_BUNDLE_SIZE = 3;
const TICKET_DISCOUNT_PER_BUNDLE = 5000;
const TICKET_PRESET_COUNTS = [0, 1, 3, 6] as const;
const MAX_TICKET_COUNT = 12;

function calculateTicketPrice(ticketCount: number) {
  const bundleCount = Math.floor(ticketCount / TICKET_DISCOUNT_BUNDLE_SIZE);
  const remainderCount = ticketCount % TICKET_DISCOUNT_BUNDLE_SIZE;

  return (
    bundleCount *
      (TICKET_UNIT_PRICE * TICKET_DISCOUNT_BUNDLE_SIZE - TICKET_DISCOUNT_PER_BUNDLE) +
    remainderCount * TICKET_UNIT_PRICE
  );
}

export default function CreateScreen() {
  const router = useRouter();
  const { draftId: draftIdParam } = useLocalSearchParams<{ draftId?: string | string[] }>();
  const {
    apiBaseUrl,
    authError,
    clearAuthError,
    createInvitationPage,
    drafts,
    isAuthenticating,
    palette,
    removeDraft,
    saveDraft,
  } = useAppState();

  const [selectedPlan, setSelectedPlan] =
    useState<MobileInvitationProductTier>('standard');
  const [selectedTheme, setSelectedTheme] =
    useState<MobileInvitationThemeKey>('emotional');
  const [groomKoreanName, setGroomKoreanName] = useState('');
  const [brideKoreanName, setBrideKoreanName] = useState('');
  const [groomEnglishName, setGroomEnglishName] = useState('');
  const [brideEnglishName, setBrideEnglishName] = useState('');
  const [password, setPassword] = useState('');
  const [ticketCount, setTicketCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);

  const selectedPlanInfo = useMemo(
    () => servicePlans.find((plan) => plan.tier === selectedPlan) ?? servicePlans[0],
    [selectedPlan]
  );
  const selectedThemeInfo = useMemo(
    () => designThemes.find((theme) => theme.key === selectedTheme) ?? designThemes[0],
    [selectedTheme]
  );
  const ticketPrice = useMemo(() => calculateTicketPrice(ticketCount), [ticketCount]);
  const discountedBundleCount = Math.floor(ticketCount / TICKET_DISCOUNT_BUNDLE_SIZE);
  const remainderTicketCount = ticketCount % TICKET_DISCOUNT_BUNDLE_SIZE;
  const totalPrice = selectedPlanInfo.price + ticketPrice;
  const slugPreview = useMemo(
    () => buildPageSlugBaseFromEnglishNames(groomEnglishName, brideEnglishName),
    [brideEnglishName, groomEnglishName]
  );
  const publicUrlPreview = useMemo(() => {
    const baseUrl = apiBaseUrl.replace(/\/+$/g, '');
    return slugPreview ? `${baseUrl}/${slugPreview}` : `${baseUrl}/...`;
  }, [apiBaseUrl, slugPreview]);
  const normalizedDraftId = Array.isArray(draftIdParam) ? draftIdParam[0] : draftIdParam;

  const validationChecklist = useMemo(
    () => [
      {
        label: '신랑 한글 이름',
        passed: Boolean(groomKoreanName.trim()),
      },
      {
        label: '신부 한글 이름',
        passed: Boolean(brideKoreanName.trim()),
      },
      {
        label: '신랑 영문 이름',
        passed: Boolean(groomEnglishName.trim()) && isValidEnglishName(groomEnglishName),
      },
      {
        label: '신부 영문 이름',
        passed: Boolean(brideEnglishName.trim()) && isValidEnglishName(brideEnglishName),
      },
      {
        label: 'URL 슬러그 생성',
        passed: Boolean(slugPreview),
      },
      {
        label: '페이지 비밀번호',
        passed: password.trim().length >= 4,
      },
    ],
    [brideEnglishName, brideKoreanName, groomEnglishName, groomKoreanName, password, slugPreview]
  );

  const validationMessages = useMemo(() => {
    const messages: string[] = [];

    if (!groomKoreanName.trim()) {
      messages.push('신랑 한글 이름을 입력해 주세요.');
    }

    if (!brideKoreanName.trim()) {
      messages.push('신부 한글 이름을 입력해 주세요.');
    }

    if (!groomEnglishName.trim()) {
      messages.push('신랑 영문 이름을 입력해 주세요.');
    } else if (!isValidEnglishName(groomEnglishName)) {
      messages.push('신랑 영문 이름은 영문, 공백, 하이픈만 사용할 수 있습니다.');
    }

    if (!brideEnglishName.trim()) {
      messages.push('신부 영문 이름을 입력해 주세요.');
    } else if (!isValidEnglishName(brideEnglishName)) {
      messages.push('신부 영문 이름은 영문, 공백, 하이픈만 사용할 수 있습니다.');
    }

    if (!slugPreview) {
      messages.push('영문 이름으로 사용할 페이지 주소를 만들 수 없습니다.');
    }

    if (!password.trim()) {
      messages.push('페이지 비밀번호를 입력해 주세요.');
    } else if (password.trim().length < 4) {
      messages.push('페이지 비밀번호는 4자 이상으로 입력해 주세요.');
    }

    return messages;
  }, [brideEnglishName, brideKoreanName, groomEnglishName, groomKoreanName, password, slugPreview]);

  useEffect(() => {
    if (!normalizedDraftId || normalizedDraftId === loadedDraftId) {
      return;
    }

    const selectedDraft = drafts.find((draft) => draft.id === normalizedDraftId);
    if (!selectedDraft) {
      return;
    }

    setSelectedPlan(selectedDraft.servicePlan);
    setSelectedTheme(selectedDraft.theme);
    setGroomKoreanName(selectedDraft.groomName);
    setBrideKoreanName(selectedDraft.brideName);
    setGroomEnglishName(selectedDraft.groomEnglishName);
    setBrideEnglishName(selectedDraft.brideEnglishName);
    setPassword('');
    setTicketCount(selectedDraft.ticketCount);
    setEditingDraftId(selectedDraft.id);
    setLoadedDraftId(selectedDraft.id);
    setPaymentModalVisible(false);
    clearAuthError();
    setNotice('저장된 초안을 불러왔습니다. 비밀번호만 다시 입력하면 이어서 진행할 수 있습니다.');
    router.replace('/create');
  }, [clearAuthError, drafts, loadedDraftId, normalizedDraftId, router]);

  const resetForm = () => {
    setSelectedPlan('standard');
    setSelectedTheme('emotional');
    setGroomKoreanName('');
    setBrideKoreanName('');
    setGroomEnglishName('');
    setBrideEnglishName('');
    setPassword('');
    setTicketCount(0);
    setEditingDraftId(null);
    setLoadedDraftId(null);
    setPaymentModalVisible(false);
    clearAuthError();
  };

  const updateTicketCount = (nextCount: number) => {
    setTicketCount(Math.max(0, Math.min(MAX_TICKET_COUNT, nextCount)));
  };

  const handleSaveDraft = async () => {
    if (!groomKoreanName.trim() || !brideKoreanName.trim()) {
      setNotice('초안 저장 전에는 신랑·신부 한글 이름을 먼저 입력해 주세요.');
      return;
    }

    const savedDraftId = await saveDraft(
      {
        servicePlan: selectedPlan,
        theme: selectedTheme,
        pageIdentifier: slugPreview,
        groomName: groomKoreanName.trim(),
        brideName: brideKoreanName.trim(),
        groomEnglishName: groomEnglishName.trim(),
        brideEnglishName: brideEnglishName.trim(),
        weddingDate: '',
        venue: '',
        estimatedPrice: totalPrice,
        ticketCount,
        notes: '',
      },
      {
        draftId: editingDraftId ?? undefined,
      }
    );

    setEditingDraftId(savedDraftId);
    setLoadedDraftId(savedDraftId);
    setNotice('제작 초안을 저장했습니다. 입력한 내용은 유지되며 홈에서도 이어서 작성할 수 있습니다.');
  };

  const handleOpenPaymentModal = () => {
    clearAuthError();

    if (validationMessages.length > 0) {
      setNotice(validationMessages[0] ?? '입력 정보를 먼저 확인해 주세요.');
      return;
    }

    setNotice('');
    setPaymentModalVisible(true);
  };

  const handleConfirmCreate = async () => {
    if (validationMessages.length > 0 || !slugPreview) {
      setNotice(validationMessages[0] ?? '입력 정보를 먼저 확인해 주세요.');
      setPaymentModalVisible(false);
      return;
    }

    setIsSubmitting(true);
    clearAuthError();

    const created = await createInvitationPage({
      slugBase: slugPreview,
      groomKoreanName: groomKoreanName.trim(),
      brideKoreanName: brideKoreanName.trim(),
      groomEnglishName: groomEnglishName.trim(),
      brideEnglishName: brideEnglishName.trim(),
      password: password.trim(),
      servicePlan: selectedPlan,
      theme: selectedTheme,
    });

    setIsSubmitting(false);

    if (!created) {
      return;
    }

    if (editingDraftId) {
      await removeDraft(editingDraftId);
    }

    resetForm();
    setNotice('청첩장을 생성했습니다. 운영 탭에서 예식 정보를 이어서 입력해 주세요.');
    router.replace('/manage');
  };

  return (
    <>
      <AppScreen
        title="구매"
        subtitle="구매 탭에서는 초안을 기기 로컬에 저장하고, 결제 완료 처리 시점에만 Firestore에 실제 페이지를 생성합니다."
      >
        <SectionCard
          title="진행 안내"
          description="구매 탭에서는 입력 정보 확인부터 페이지 생성 직후 운영 이동까지 한 흐름으로 처리합니다."
        >
          <BulletList items={[...FLOW_GUIDE_ITEMS]} />
        </SectionCard>

        <SectionCard
          title="1. 입력 정보 확인"
          description="신랑·신부 한글 이름과 영문 이름을 확인하면, 영문 이름 기준으로 페이지 URL이 자동 생성됩니다."
          badge={validationMessages.length === 0 ? '입력 완료' : `${validationMessages.length}개 확인 필요`}
        >
          <TextField
            label="신랑 한글 이름"
            value={groomKoreanName}
            onChangeText={setGroomKoreanName}
            placeholder="예: 신민제"
          />
          <TextField
            label="신부 한글 이름"
            value={brideKoreanName}
            onChangeText={setBrideKoreanName}
            placeholder="예: 김현지"
          />
          <TextField
            label="신랑 영문 이름"
            value={groomEnglishName}
            onChangeText={setGroomEnglishName}
            placeholder="예: shin-minje"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="신부 영문 이름"
            value={brideEnglishName}
            onChangeText={setBrideEnglishName}
            placeholder="예: kim-hyunji"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="페이지 비밀번호"
            value={password}
            onChangeText={setPassword}
            placeholder="페이지별 비밀번호 입력"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleOpenPaymentModal}
          />

          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText variant="caption" style={styles.previewLabel}>
              생성될 URL 미리보기
            </AppText>
            <AppText style={styles.previewValue}>
              {publicUrlPreview}
            </AppText>
          </View>

          <View style={styles.validationList}>
            {validationChecklist.map((item) => (
              <View key={item.label} style={styles.validationRow}>
                <AppText
                  variant="caption"
                  color={item.passed ? palette.accent : palette.danger}
                  style={styles.validationState}
                >
                  {item.passed ? '완료' : '확인 필요'}
                </AppText>
                <AppText style={styles.validationText}>
                  {item.label}
                </AppText>
              </View>
            ))}
          </View>

          {validationMessages.length > 0 ? (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: palette.dangerSoft,
                  borderColor: palette.danger,
                },
              ]}
            >
              {validationMessages.map((message) => (
                <AppText
                  key={message}
                  variant="caption"
                  color={palette.danger}
                  style={styles.noticeText}
                >
                  · {message}
                </AppText>
              ))}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard
          title="2. 서비스와 디자인 선택"
          description="서비스에 따라 기본 기능과 가격이 달라지고, 디자인은 생성 직후 기본 테마로 적용됩니다."
        >
          <View style={styles.chipRow}>
            {servicePlans.map((plan) => (
              <ChoiceChip
                key={plan.name}
                label={`${plan.name} · ${formatPrice(plan.price)}`}
                selected={selectedPlan === plan.tier}
                onPress={() => setSelectedPlan(plan.tier)}
              />
            ))}
          </View>
          <AppText variant="muted" style={styles.helperText}>
            {selectedPlanInfo.description}
          </AppText>
          <BulletList items={selectedPlanInfo.features} />

          <View style={styles.divider} />

          <View style={styles.chipRow}>
            {designThemes.map((theme) => (
              <ChoiceChip
                key={theme.key}
                label={theme.label}
                selected={selectedTheme === theme.key}
                onPress={() => setSelectedTheme(theme.key)}
              />
            ))}
          </View>
          <AppText variant="muted" style={styles.helperText}>
            선택한 디자인: {selectedThemeInfo.description}
          </AppText>
        </SectionCard>

        <SectionCard
          title="추가 티켓 구매"
          description="티켓은 장수만 먼저 구매하고, 사용 범위는 아래 정책대로 적용합니다."
          badge={`${ticketCount}장`}
        >
          <AppText variant="muted" style={styles.helperText}>
            1장당 5,000원이며, 3장 단위로 구매할 때마다 5,000원이 할인됩니다.
          </AppText>

          <View style={styles.ticketPresetRow}>
            {TICKET_PRESET_COUNTS.map((count) => (
              <ChoiceChip
                key={count}
                label={`${count}장`}
                selected={ticketCount === count}
                onPress={() => updateTicketCount(count)}
              />
            ))}
          </View>

          <View
            style={[
              styles.ticketCounterCard,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => updateTicketCount(ticketCount - 1)}
              style={[
                styles.ticketCounterButton,
                { borderColor: palette.cardBorder, backgroundColor: palette.surface },
              ]}
            >
              <AppText variant="title" style={styles.ticketCounterButtonLabel}>
                -
              </AppText>
            </Pressable>
            <View style={styles.ticketCounterValueBox}>
              <AppText variant="title" style={styles.ticketCounterValue}>
                {ticketCount}
              </AppText>
              <AppText variant="caption" style={styles.ticketCounterCaption}>
                구매할 티켓 장수
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => updateTicketCount(ticketCount + 1)}
              style={[
                styles.ticketCounterButton,
                { borderColor: palette.cardBorder, backgroundColor: palette.surface },
              ]}
            >
              <AppText variant="title" style={styles.ticketCounterButtonLabel}>
                +
              </AppText>
            </Pressable>
          </View>

          <View
            style={[
              styles.ticketSummaryCard,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText style={styles.ticketSummaryText}>
              3장 할인 묶음: {discountedBundleCount}개
            </AppText>
            <AppText style={styles.ticketSummaryText}>
              낱장 계산: {remainderTicketCount}장
            </AppText>
            <AppText color={palette.accent} style={styles.ticketSummaryText}>
              티켓 금액: {formatPrice(ticketPrice)}
            </AppText>
          </View>

          <BulletList items={[...TICKET_USAGE_ITEMS]} />
        </SectionCard>

        <SectionCard
          title="3. 결제 확인과 페이지 생성"
          description="현재는 실제 결제 연동 대신 확인 팝업만 띄우고, 확인 즉시 페이지를 생성한 뒤 운영 탭 슬라이드 입력으로 이동합니다."
        >
          <View style={styles.summaryRow}>
            <AppText style={styles.summaryLabel}>기본 서비스</AppText>
            <AppText style={styles.summaryValue}>
              {formatPrice(selectedPlanInfo.price)}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText style={styles.summaryLabel}>추가 티켓</AppText>
            <AppText style={styles.summaryValue}>
              {ticketCount}장 / {formatPrice(ticketPrice)}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText style={styles.summaryLabel}>예상 총액</AppText>
            <AppText variant="title" color={palette.accent} style={styles.totalLabel}>
              {formatPrice(totalPrice)}
            </AppText>
          </View>

          {notice ? (
            <AppText variant="caption" color={palette.accent} style={styles.helperText}>
              {notice}
            </AppText>
          ) : null}

          {authError ? (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: palette.dangerSoft,
                  borderColor: palette.danger,
                },
              ]}
            >
              <AppText variant="caption" color={palette.danger} style={styles.noticeText}>
                {authError}
              </AppText>
            </View>
          ) : null}

          <View style={styles.actionColumn}>
            <ActionButton variant="secondary" onPress={() => void handleSaveDraft()} fullWidth>
              제작 초안 저장
            </ActionButton>
            <ActionButton onPress={handleOpenPaymentModal} fullWidth>
              결제 확인 팝업 열기
            </ActionButton>
          </View>
        </SectionCard>
      </AppScreen>

      <Modal
        visible={paymentModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPaymentModalVisible(false)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText variant="title" style={styles.modalTitle}>
              결제 확인
            </AppText>
            <AppText variant="muted" style={styles.modalDescription}>
              실제 결제는 아직 연결하지 않았습니다. 이 팝업에서 확인을 누르면 페이지를 생성하고 운영 탭으로 바로 이동합니다.
            </AppText>

            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>
                서비스
              </AppText>
              <AppText style={styles.summaryValue}>
                {selectedPlanInfo.name}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>디자인</AppText>
              <AppText style={styles.summaryValue}>
                {selectedThemeInfo.label}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>추가 티켓</AppText>
              <AppText style={styles.summaryValue}>
                {ticketCount}장 / {formatPrice(ticketPrice)}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>생성 URL</AppText>
              <AppText style={styles.summaryValue}>
                {slugPreview}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>결제 예정 금액</AppText>
              <AppText variant="title" color={palette.accent} style={styles.totalLabel}>
                {formatPrice(totalPrice)}
              </AppText>
            </View>

            {authError ? (
              <AppText variant="caption" color={palette.danger} style={styles.modalErrorText}>
                {authError}
              </AppText>
            ) : null}

            <View style={styles.actionColumn}>
              <ActionButton
                variant="secondary"
                onPress={() => setPaymentModalVisible(false)}
                fullWidth
              >
                다시 확인하기
              </ActionButton>
              <ActionButton
                onPress={() => void handleConfirmCreate()}
                loading={isSubmitting || isAuthenticating}
                fullWidth
              >
                확인 후 페이지 생성
              </ActionButton>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperText: {
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: '#d8d1cb',
    opacity: 0.7,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  previewLabel: {
    fontWeight: '700',
  },
  previewValue: {
    fontWeight: '700',
  },
  validationList: {
    gap: 8,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationState: {
    width: 60,
    fontWeight: '800',
  },
  validationText: {
    flex: 1,
    lineHeight: 20,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  noticeText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  ticketPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketCounterCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  ticketCounterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCounterButtonLabel: {
    fontWeight: '800',
  },
  ticketCounterValueBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  ticketCounterValue: {
    fontWeight: '800',
  },
  ticketCounterCaption: {
    fontWeight: '600',
  },
  ticketSummaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  ticketSummaryText: {
    lineHeight: 20,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    lineHeight: 20,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  totalLabel: {
    fontWeight: '800',
  },
  actionColumn: {
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 12, 10, 0.58)',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalDescription: {
    lineHeight: 21,
  },
  modalErrorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
});
