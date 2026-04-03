'use client';

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useAdmin } from '@/contexts';
import { USE_FIREBASE } from '@/lib/firebase';
import { uploadPageEditorImage } from '@/services/imageService';
import {
  getEditableInvitationPageConfig,
  restoreInvitationPageConfig,
  saveInvitationPageConfig,
  setInvitationPagePublished,
} from '@/services/invitationPageService';
import { getClientEditorTokenHash } from '@/services/passwordService';
import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  AccountSectionPanel,
  GuideSectionPanel,
  PersonEditorCard,
} from './pageEditorPanels';
import PageEditorSectionPreview, {
  type PreviewSectionKind,
} from './PageEditorSectionPreview';
import styles from './page.module.css';
import { type PreviewThemeKey } from './pageEditorPreviewUtils';
import {
  cloneConfig,
  createEmptyAccount,
  createEmptyGuideItem,
  keywordsToText,
  normalizeFormConfig,
  prepareConfigForSave,
  textToKeywords,
  type AccountKind,
  type GuideKind,
  type NoticeTone,
  type ParentRole,
  type PersonRole,
} from './pageEditorUtils';

const TOKEN_STORAGE_PREFIX = 'page-editor-token:';
const MAX_REPEATABLE_ITEMS = 3;
const MAX_GALLERY_IMAGES = 3;
const AUTOSAVE_DELAY_MS = 1500;

type NoticeState = { tone: NoticeTone; message: string } | null;
type SaveState = 'idle' | 'autosaving' | 'saving' | 'saved' | 'error' | 'publishing';
type WorkspaceView = 'form' | 'preview';
type UploadFieldKind = 'wedding' | 'favicon' | 'gallery';
type EditorStepKey =
  | 'basic'
  | 'schedule'
  | 'venue'
  | 'greeting'
  | 'gallery'
  | 'gift'
  | 'final';

type StepReview = {
  requiredCount: number;
  completedRequiredCount: number;
  missing: string[];
  warnings: string[];
  isOptional: boolean;
};

type StepDefinition = {
  key: EditorStepKey;
  step: string;
  title: string;
  description: string;
  previewSection: PreviewSectionKind;
  isOptional: boolean;
};

const EDITOR_STEPS: StepDefinition[] = [
  {
    key: 'basic',
    step: '01',
    title: '기본 정보',
    description: '청첩장 이름과 소개 문구를 먼저 정리합니다.',
    previewSection: 'cover',
    isOptional: false,
  },
  {
    key: 'schedule',
    step: '02',
    title: '예식 일정',
    description: '날짜와 시간을 정확하게 입력하고 문장형 요약을 확인합니다.',
    previewSection: 'wedding',
    isOptional: false,
  },
  {
    key: 'venue',
    step: '03',
    title: '예식장 안내',
    description: '홀 이름, 주소, 교통 안내를 손님 시선으로 정리합니다.',
    previewSection: 'wedding',
    isOptional: false,
  },
  {
    key: 'greeting',
    step: '04',
    title: '문구와 인사말',
    description: '신랑 · 신부 정보와 인사말을 자연스럽게 다듬습니다.',
    previewSection: 'greeting',
    isOptional: false,
  },
  {
    key: 'gallery',
    step: '05',
    title: '대표 이미지',
    description: '첫 화면과 갤러리 분위기를 결정하는 대표 이미지를 확인합니다.',
    previewSection: 'gallery',
    isOptional: true,
  },
  {
    key: 'gift',
    step: '06',
    title: '마음 전하실 곳',
    description: '계좌 안내와 신랑측 · 신부측 계좌를 필요할 때만 입력합니다.',
    previewSection: 'gift',
    isOptional: true,
  },
  {
    key: 'final',
    step: '07',
    title: '최종 확인과 발행',
    description: '검색 공유 문구, 링크, 발행 상태를 마지막으로 점검합니다.',
    previewSection: 'metadata',
    isOptional: false,
  },
];

const STEP_MAP = Object.fromEntries(
  EDITOR_STEPS.map((step) => [step.key, step])
) as Record<EditorStepKey, StepDefinition>;

const GREETING_TEMPLATES = [
  {
    label: '격식형',
    value:
      '서로의 삶을 함께 걸어가기로 약속한 저희 두 사람이 소중한 분들을 모시고 새로운 출발을 하고자 합니다. 귀한 걸음으로 함께 축복해 주시면 더없는 기쁨이겠습니다.',
  },
  {
    label: '담백형',
    value:
      '저희 두 사람이 사랑으로 하나가 되는 날, 소중한 분들과 그 기쁨을 함께 나누고 싶습니다. 편안한 마음으로 오셔서 함께해 주세요.',
  },
  {
    label: '따뜻한형',
    value:
      '오랜 시간 아껴 주신 마음들 덕분에 저희가 한 가정을 이루게 되었습니다. 소중한 날에 함께해 주셔서 따뜻한 축복을 나눠 주시면 감사하겠습니다.',
  },
];

const TRANSPORT_GUIDE_TEMPLATES = [
  {
    label: '주차 안내',
    value: '건물 내 주차장을 이용하실 수 있으며, 예식 참석 고객은 무료 주차가 가능합니다.',
  },
  {
    label: '대중교통',
    value: '지하철역에서 도보로 이동 가능한 위치입니다. 대중교통 이용 시 더욱 편하게 방문하실 수 있습니다.',
  },
  {
    label: '홀 위치',
    value: '예식장은 건물 내부 홀에서 진행되며, 안내 표지판을 따라 이동하시면 바로 찾으실 수 있습니다.',
  },
];

const GALLERY_GUIDE_ITEMS = [
  '세로 1080px 이상 이미지를 권장합니다.',
  'JPG 또는 PNG 이미지를 사용해 주세요.',
  '인물의 얼굴과 손이 중앙에 오도록 여백을 확인해 주세요.',
];

interface PageEditorClientProps {
  slug: string;
  initialDisplayName: string;
  initialGroomName: string;
  initialBrideName: string;
  initialDate: string;
  initialVenue: string;
}

function buildEditorTitle(groomName: string, brideName: string, fallbackLabel: string) {
  const groom = groomName.trim();
  const bride = brideName.trim();

  if (groom && bride) {
    return `${groom}, ${bride}님의 청첩장 설정`;
  }

  if (groom || bride) {
    return `${groom || bride}님의 청첩장 설정`;
  }

  return `${fallbackLabel} 청첩장 설정`;
}

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function parseNumericInput(value: string, fallback = 0) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isValidUrl(value?: string | null) {
  if (!hasText(value)) {
    return true;
  }

  try {
    const url = new URL(value!);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidPhone(value?: string | null) {
  if (!hasText(value)) {
    return true;
  }

  const digits = value!.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}

function isValidDateTimeSeed(formState: InvitationPageSeed) {
  const { year, month, day, hour, minute } = formState.weddingDateTime;
  if (
    year < 1900 ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return false;
  }

  const date = new Date(year, month, day, hour, minute);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
}

function buildWeddingDateObject(formState: InvitationPageSeed) {
  if (!isValidDateTimeSeed(formState)) {
    return null;
  }

  const { year, month, day, hour, minute } = formState.weddingDateTime;
  return new Date(year, month, day, hour, minute);
}

function formatDateInputValue(formState: InvitationPageSeed) {
  const date = buildWeddingDateObject(formState);
  if (!date) {
    return '';
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(formState: InvitationPageSeed) {
  const date = buildWeddingDateObject(formState);
  if (!date) {
    return '';
  }

  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function formatWeddingDateLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function formatWeddingTimeLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function buildWeddingSummary(formState: InvitationPageSeed) {
  const date = buildWeddingDateObject(formState);
  if (!date) {
    return '예식 날짜와 시간을 입력하면 문장형 요약이 여기 표시됩니다.';
  }

  return `${formatWeddingDateLabel(date)} ${formatWeddingTimeLabel(date)}`;
}

function syncWeddingPresentation(draft: InvitationPageSeed) {
  if (!draft.pageData) {
    return;
  }

  const date = buildWeddingDateObject(draft);
  if (!date) {
    return;
  }

  draft.date = formatWeddingDateLabel(date);
  draft.pageData.ceremonyTime = formatWeddingTimeLabel(date);
}

function formatSavedAt(date: Date | null) {
  if (!date) {
    return '아직 저장 기록이 없습니다.';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function createStepReview(
  requiredFields: Array<{ label: string; filled: boolean }>,
  warnings: string[],
  isOptional: boolean
): StepReview {
  return {
    requiredCount: requiredFields.length,
    completedRequiredCount: requiredFields.filter((field) => field.filled).length,
    missing: requiredFields.filter((field) => !field.filled).map((field) => field.label),
    warnings,
    isOptional,
  };
}

function buildStepReviews(formState: InvitationPageSeed | null): Record<EditorStepKey, StepReview> {
  const emptyReview = (isOptional: boolean): StepReview => ({
    requiredCount: 0,
    completedRequiredCount: 0,
    missing: [],
    warnings: [],
    isOptional,
  });

  if (!formState) {
    return {
      basic: emptyReview(false),
      schedule: emptyReview(false),
      venue: emptyReview(false),
      greeting: emptyReview(false),
      gallery: emptyReview(true),
      gift: emptyReview(true),
      final: emptyReview(false),
    };
  }

  const giftAccounts = [
    ...(formState.pageData?.giftInfo?.groomAccounts ?? []),
    ...(formState.pageData?.giftInfo?.brideAccounts ?? []),
  ];

  const galleryWarnings: string[] = [];
  if (!isValidUrl(formState.metadata.images.wedding)) {
    galleryWarnings.push('대표 이미지 주소 형식을 다시 확인해 주세요.');
  }
  if (
    (formState.pageData?.galleryImages ?? []).some((imageUrl) => !isValidUrl(imageUrl))
  ) {
    galleryWarnings.push('갤러리 이미지 주소 형식을 다시 확인해 주세요.');
  }

  const venueWarnings: string[] = [];
  if (!isValidPhone(formState.pageData?.ceremonyContact)) {
    venueWarnings.push('예식장 연락처 형식이 올바른지 확인해 주세요.');
  }
  if (!isValidUrl(formState.pageData?.mapUrl)) {
    venueWarnings.push('지도 링크는 http 또는 https 주소로 입력해 주세요.');
  }

  const greetingWarnings: string[] = [];
  if ((formState.pageData?.greetingMessage ?? '').trim().length > 140) {
    greetingWarnings.push('인사말이 길어지면 미리보기에서 줄바꿈이 많아질 수 있습니다.');
  }

  const phoneTargets = [
    formState.couple.groom.phone,
    formState.couple.bride.phone,
    formState.couple.groom.father?.phone,
    formState.couple.groom.mother?.phone,
    formState.couple.bride.father?.phone,
    formState.couple.bride.mother?.phone,
  ];
  if (phoneTargets.some((value) => !isValidPhone(value))) {
    greetingWarnings.push('연락처는 010-1234-5678 형식으로 입력해 주세요.');
  }

  const giftWarnings: string[] = [];
  if (
    giftAccounts.some(
      (account) =>
        (hasText(account.accountNumber) || hasText(account.bank) || hasText(account.accountHolder)) &&
        !(hasText(account.accountNumber) && hasText(account.bank) && hasText(account.accountHolder))
    )
  ) {
    giftWarnings.push('계좌는 은행명, 계좌번호, 예금주를 한 세트로 모두 입력해 주세요.');
  }

  const finalWarnings: string[] = [];
  if (!isValidUrl(formState.metadata.images.favicon)) {
    finalWarnings.push('파비콘 주소는 http 또는 https 형식으로 입력해 주세요.');
  }

  return {
    basic: createStepReview(
      [
        { label: '청첩장 이름', filled: hasText(formState.displayName) },
        { label: '소개 문구', filled: hasText(formState.description) },
      ],
      [],
      false
    ),
    schedule: createStepReview(
      [
        { label: '예식 날짜와 시간', filled: isValidDateTimeSeed(formState) },
        { label: '표지용 날짜 문구', filled: hasText(formState.date) },
      ],
      [],
      false
    ),
    venue: createStepReview(
      [
        { label: '예식장 이름', filled: hasText(formState.venue) },
        { label: '표시 장소명', filled: hasText(formState.pageData?.venueName) },
        { label: '예식장 주소', filled: hasText(formState.pageData?.ceremonyAddress) },
      ],
      venueWarnings,
      false
    ),
    greeting: createStepReview(
      [
        { label: '신랑 이름', filled: hasText(formState.couple.groom.name) },
        { label: '신부 이름', filled: hasText(formState.couple.bride.name) },
        { label: '인사말 본문', filled: hasText(formState.pageData?.greetingMessage) },
      ],
      greetingWarnings,
      false
    ),
    gallery: createStepReview([], galleryWarnings, true),
    gift: createStepReview([], giftWarnings, true),
    final: createStepReview(
      [
        { label: '브라우저 제목', filled: hasText(formState.metadata.title) },
        { label: '대표 설명 문구', filled: hasText(formState.metadata.description) },
        { label: '파비콘 주소', filled: hasText(formState.metadata.images.favicon) },
      ],
      finalWarnings,
      false
    ),
  };
}

function findFirstInvalidRequiredStep(reviews: Record<EditorStepKey, StepReview>) {
  return (
    EDITOR_STEPS.find(
      (step) => !step.isOptional && reviews[step.key].completedRequiredCount < reviews[step.key].requiredCount
    )?.key ?? null
  );
}

function getNextStepKey(currentStep: EditorStepKey | null) {
  if (!currentStep) {
    return EDITOR_STEPS[0]?.key ?? null;
  }

  const currentIndex = EDITOR_STEPS.findIndex((step) => step.key === currentStep);
  if (currentIndex < 0 || currentIndex >= EDITOR_STEPS.length - 1) {
    return null;
  }

  return EDITOR_STEPS[currentIndex + 1]?.key ?? null;
}

function getPreviousStepKey(currentStep: EditorStepKey | null) {
  if (!currentStep) {
    return null;
  }

  const currentIndex = EDITOR_STEPS.findIndex((step) => step.key === currentStep);
  if (currentIndex <= 0) {
    return null;
  }

  return EDITOR_STEPS[currentIndex - 1]?.key ?? null;
}

function getStepCriteriaText(step: StepDefinition, review: StepReview) {
  if (step.isOptional) {
    if (step.key === 'gallery') {
      return '선택 항목 · 대표 이미지 1장만 정해도 충분합니다.';
    }

    if (step.key === 'gift') {
      return `선택 항목 · 계좌와 안내는 최대 ${MAX_REPEATABLE_ITEMS}개까지 입력할 수 있습니다.`;
    }

    return '선택 항목 · 필요한 경우에만 입력해 주세요.';
  }

  return `완료 기준 · 필수 ${review.completedRequiredCount}/${review.requiredCount}`;
}

function getStepSummaryText(step: StepDefinition, review: StepReview) {
  if (step.isOptional) {
    return review.warnings.length > 0 ? '선택 항목 확인 필요' : '선택 항목';
  }

  return `필수 ${review.completedRequiredCount}/${review.requiredCount}`;
}

function renderFieldMeta(
  label: string,
  requirement: 'required' | 'optional',
  hint?: string
) {
  return (
    <>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span
          className={
            requirement === 'required'
              ? styles.fieldBadgeRequired
              : styles.fieldBadgeOptional
          }
        >
          {requirement === 'required' ? '필수' : '선택'}
        </span>
      </span>
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </>
  );
}

export default function PageEditorClient({
  slug,
  initialDisplayName,
  initialGroomName,
  initialBrideName,
  initialDate,
  initialVenue,
}: PageEditorClientProps) {
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();
  const storageKey = `${TOKEN_STORAGE_PREFIX}${slug}`;

  const [formState, setFormState] = useState<InvitationPageSeed | null>(null);
  const [baselineState, setBaselineState] = useState<InvitationPageSeed | null>(null);
  const [published, setPublished] = useState(true);
  const [baselinePublished, setBaselinePublished] = useState(true);
  const [hasCustomConfig, setHasCustomConfig] = useState(false);
  const [dataSourceLabel, setDataSourceLabel] = useState('기본 샘플 사용 중');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [editorTokenHash, setEditorTokenHash] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [previewTheme, setPreviewTheme] = useState<PreviewThemeKey>('emotional');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('form');
  const [isStepMenuOpen, setIsStepMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<EditorStepKey | null>('basic');
  const [highlightedStep, setHighlightedStep] = useState<EditorStepKey | null>('basic');
  const [uploadingField, setUploadingField] = useState<UploadFieldKind | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const faviconUploadInputRef = useRef<HTMLInputElement | null>(null);
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);

  const canEdit = isAdminLoggedIn || Boolean(editorTokenHash);
  const canUploadImages = USE_FIREBASE && canEdit;
  const title = buildEditorTitle(
    formState?.couple.groom.name ?? initialGroomName,
    formState?.couple.bride.name ?? initialBrideName,
    formState?.displayName || initialDisplayName || slug
  );
  const previewLinks = [
    { href: `/${slug}`, label: '감성형 청첩장 보기' },
    { href: `/${slug}/simple`, label: '심플형 청첩장 보기' },
  ];

  const hasConfigChanges = Boolean(
    formState &&
      baselineState &&
      JSON.stringify(formState) !== JSON.stringify(baselineState)
  );
  const hasPublishChanges = published !== baselinePublished;
  const isDirty = hasConfigChanges || hasPublishChanges;

  const stepReviews = useMemo(() => buildStepReviews(formState), [formState]);
  const firstInvalidRequiredStep = useMemo(
    () => findFirstInvalidRequiredStep(stepReviews),
    [stepReviews]
  );
  const totalRequiredFields = useMemo(
    () =>
      EDITOR_STEPS.filter((step) => !step.isOptional).reduce(
        (total, step) => total + stepReviews[step.key].requiredCount,
        0
      ),
    [stepReviews]
  );
  const completedRequiredFields = useMemo(
    () =>
      EDITOR_STEPS.filter((step) => !step.isOptional).reduce(
        (total, step) => total + stepReviews[step.key].completedRequiredCount,
        0
      ),
    [stepReviews]
  );
  const progressPercent =
    totalRequiredFields > 0
      ? Math.round((completedRequiredFields / totalRequiredFields) * 100)
      : 0;
  const currentPreviewHref = previewTheme === 'simple' ? `/${slug}/simple` : `/${slug}`;
  const weddingSummary = formState ? buildWeddingSummary(formState) : '아직 입력되지 않았습니다.';
  const currentStepKey = activeStep ?? 'basic';
  const currentStep = STEP_MAP[currentStepKey];
  const currentReview = stepReviews[currentStepKey];
  const previousStepKey = useMemo(() => getPreviousStepKey(activeStep), [activeStep]);
  const previousStep = previousStepKey ? STEP_MAP[previousStepKey] : null;
  const nextStepKey = useMemo(() => getNextStepKey(activeStep), [activeStep]);
  const nextStep = nextStepKey ? STEP_MAP[nextStepKey] : null;
  const primaryActionLabel =
    activeStep === 'final'
      ? published
        ? '발행하기'
        : '비공개로 저장하기'
      : nextStep
        ? `${nextStep.step} 단계: ${nextStep.title} `
        : '1단계부터 시작하기';
  const primaryActionHint =
    activeStep === 'final'
      ? firstInvalidRequiredStep
        ? `${STEP_MAP[firstInvalidRequiredStep].step} 단계의 필수 정보를 먼저 채워 주세요.`
        : '필수 항목을 모두 마쳤다면 마지막으로 발행 상태를 확인해 주세요.'
      : activeStep
        ? nextStep
          ? `현재 단계를 확인했다면 ${nextStep.step} 단계로 이어서 작성해 주세요.`
          : '다음 단계 버튼으로 순서대로 입력하면 됩니다.'
        : '모든 단계를 접어 둔 상태입니다. 1단계부터 순서대로 열어 작성해 주세요.';
  const publishStatusText = published
    ? '손님이 바로 볼 수 있는 공개 상태입니다.'
    : '저장해도 손님에게는 보이지 않는 비공개 상태입니다.';
  const completionStatusText = firstInvalidRequiredStep
    ? `${STEP_MAP[firstInvalidRequiredStep].step} 단계 필수 입력이 남아 있습니다.`
    : '필수 항목이 모두 채워져 발행할 수 있습니다.';
  const systemStatusLabel = hasCustomConfig ? '맞춤 설정 저장됨' : dataSourceLabel;
  const canCopyPublishedLink = published && !hasPublishChanges;

  const applyLoadedConfig = (
    config: Awaited<ReturnType<typeof getEditableInvitationPageConfig>>
  ) => {
    if (!config) {
      throw new Error('설정 정보를 찾을 수 없습니다.');
    }

    const normalized = normalizeFormConfig(config.config);
    setFormState(normalized);
    setBaselineState(cloneConfig(normalized));
    setPublished(config.published);
    setBaselinePublished(config.published);
    setHasCustomConfig(config.hasCustomConfig);
    setDataSourceLabel(
      config.dataSource === 'firestore' ? '맞춤 설정 사용 중' : '기본 샘플 사용 중'
    );
    setLastSavedAt(config.lastSavedAt);
    setSaveState('idle');
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedToken = window.localStorage.getItem(storageKey);
    if (savedToken) {
      setEditorTokenHash(savedToken);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isAdminLoading || !canEdit) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      try {
        const config = await getEditableInvitationPageConfig(slug);
        if (cancelled) {
          return;
        }

        applyLoadedConfig(config);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('[PageEditorClient] failed to load config', error);
        setSaveState('error');
        setNotice({
          tone: 'error',
          message: '설정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [canEdit, isAdminLoading, slug]);

  useEffect(() => {
    if (!formState) {
      return;
    }

    setActiveStep((currentStep) =>
      currentStep === null || currentStep in STEP_MAP
        ? currentStep
        : firstInvalidRequiredStep ?? 'basic'
    );
    setHighlightedStep((currentStep) =>
      currentStep === null || currentStep in STEP_MAP
        ? currentStep
        : firstInvalidRequiredStep ?? 'basic'
    );
  }, [formState, firstInvalidRequiredStep]);

  useEffect(() => {
    if (
      !hasConfigChanges ||
      hasPublishChanges ||
      !formState ||
      !canEdit ||
      isLoading ||
      isSaving ||
      isSavingVisibility ||
      isRestoring
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void persistDraft('auto');
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    canEdit,
    formState,
    hasConfigChanges,
    hasPublishChanges,
    isLoading,
    isRestoring,
    isSaving,
    isSavingVisibility,
  ]);

  useEffect(() => {
    if (isDirty) {
      setSaveState((current) => (current === 'saved' ? 'idle' : current));
    }
  }, [isDirty]);

  const updateForm = (updater: (draft: InvitationPageSeed) => void) => {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      const next = cloneConfig(current);
      updater(next);
      return next;
    });
  };

  const persistDraft = async (mode: 'manual' | 'auto') => {
    if (!formState) {
      return false;
    }

    if (mode === 'manual') {
      setIsSaving(true);
    }
    setSaveState(mode === 'auto' ? 'autosaving' : 'saving');

    try {
      const nextConfig = prepareConfigForSave(formState, slug);
      await saveInvitationPageConfig(nextConfig, {
        published: baselinePublished,
        editorTokenHash: isAdminLoggedIn ? null : editorTokenHash,
      });
      setFormState(cloneConfig(nextConfig));
      setBaselineState(cloneConfig(nextConfig));
      setHasCustomConfig(true);
      setDataSourceLabel('맞춤 설정 사용 중');
      setLastSavedAt(new Date());
      setSaveState('saved');

      if (mode === 'manual') {
        setNotice({
          tone: 'success',
          message: '변경 내용을 임시저장했습니다.',
        });
      }

      return true;
    } catch (error) {
      console.error('[PageEditorClient] failed to save config', error);
      setSaveState('error');

      if (mode === 'manual') {
        setNotice({
          tone: 'error',
          message: '임시저장에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
        });
      }

      return false;
    } finally {
      if (mode === 'manual') {
        setIsSaving(false);
      }
    }
  };

  const handleUnlock = async () => {
    const trimmedPassword = passwordInput.trim();
    if (!trimmedPassword) {
      setNotice({ tone: 'error', message: '페이지 비밀번호를 입력해 주세요.' });
      return;
    }

    setIsUnlocking(true);

    try {
      const token = await getClientEditorTokenHash(slug, trimmedPassword);
      if (!token) {
        setNotice({
          tone: 'error',
          message: '비밀번호가 올바르지 않습니다. 다시 확인해 주세요.',
        });
        return;
      }

      setEditorTokenHash(token);
      setPasswordInput('');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, token);
      }
      setNotice({
        tone: 'success',
        message: '편집 권한을 확인했습니다. 설정 정보를 불러오는 중입니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to verify password', error);
      setSaveState('error');
      setNotice({
        tone: 'error',
        message: '비밀번호 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const loadLatestConfig = async (successMessage?: string) => {
    setIsRefreshing(true);

    try {
      const config = await getEditableInvitationPageConfig(slug);
      applyLoadedConfig(config);
      if (successMessage) {
        setNotice({ tone: 'success', message: successMessage });
      }
    } catch (error) {
      console.error('[PageEditorClient] failed to refresh config', error);
      setSaveState('error');
      setNotice({
        tone: 'error',
        message: '최신 설정을 불러오지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (isDirty && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '저장하지 않은 변경 사항이 사라집니다. 최신 설정을 다시 불러올까요?'
      );
      if (!confirmed) {
        return;
      }
    }

    await loadLatestConfig('최신 설정을 다시 불러왔습니다.');
  };

  const handleRestore = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '기본값으로 복원하면 현재 맞춤 설정이 초기화됩니다. 계속할까요?'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsRestoring(true);

    try {
      await restoreInvitationPageConfig(slug, {
        published: baselinePublished,
        editorTokenHash: isAdminLoggedIn ? null : editorTokenHash,
      });
      await loadLatestConfig('기본 설정으로 복원했습니다.');
    } catch (error) {
      console.error('[PageEditorClient] failed to restore config', error);
      setSaveState('error');
      setNotice({
        tone: 'error',
        message: '기본 설정으로 복원하지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleApplyVisibility = async () => {
    if (published && firstInvalidRequiredStep) {
      const step = STEP_MAP[firstInvalidRequiredStep];
      jumpToStep(firstInvalidRequiredStep);
      setNotice({
        tone: 'error',
        message: `${step.step} 단계의 필수 정보를 먼저 입력해 주세요.`,
      });
      return;
    }

    setIsSavingVisibility(true);
    setSaveState('publishing');

    try {
      if (hasConfigChanges && formState) {
        const nextConfig = prepareConfigForSave(formState, slug);
        await saveInvitationPageConfig(nextConfig, {
          published,
          editorTokenHash: isAdminLoggedIn ? null : editorTokenHash,
        });
        setFormState(cloneConfig(nextConfig));
        setBaselineState(cloneConfig(nextConfig));
        setHasCustomConfig(true);
        setDataSourceLabel('맞춤 설정 사용 중');
      } else {
        await setInvitationPagePublished(slug, published, {
          editorTokenHash: isAdminLoggedIn ? null : editorTokenHash,
        });
      }

      setBaselinePublished(published);
      setLastSavedAt(new Date());
      setSaveState('saved');
      setNotice({
        tone: 'success',
        message: published ? '발행 상태를 반영했습니다.' : '비공개 상태를 반영했습니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to apply visibility', error);
      setSaveState('error');
      setNotice({
        tone: 'error',
        message: '발행 상태를 반영하지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const handleCopyPreviewLink = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${currentPreviewHref}`);
      setNotice({
        tone: 'success',
        message: '현재 미리보기 링크를 복사했습니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to copy preview link', error);
      setNotice({
        tone: 'error',
        message: '링크를 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.',
      });
    }
  };

  const handleTopLevelFieldChange = (
    field: 'displayName' | 'description' | 'venue',
    value: string
  ) => {
    updateForm((draft) => {
      draft[field] = value;
      if (field === 'venue' && draft.pageData) {
        draft.pageData.venueName = value;
      }
    });
  };

  const handleManualDateTextChange = (value: string) => {
    updateForm((draft) => {
      draft.date = value;
    });
  };

  const handleDateInputChange = (value: string) => {
    updateForm((draft) => {
      if (!value) {
        return;
      }

      const [yearText, monthText, dayText] = value.split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);

      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return;
      }

      draft.weddingDateTime.year = year;
      draft.weddingDateTime.month = month - 1;
      draft.weddingDateTime.day = day;
      syncWeddingPresentation(draft);
    });
  };

  const handleTimeInputChange = (value: string) => {
    updateForm((draft) => {
      if (!value) {
        return;
      }

      const [hourText, minuteText] = value.split(':');
      const hour = Number(hourText);
      const minute = Number(minuteText);

      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return;
      }

      draft.weddingDateTime.hour = hour;
      draft.weddingDateTime.minute = minute;
      syncWeddingPresentation(draft);
    });
  };

  const handlePageDataFieldChange = (
    field:
      | 'subtitle'
      | 'ceremonyTime'
      | 'ceremonyAddress'
      | 'ceremonyContact'
      | 'greetingMessage'
      | 'greetingAuthor'
      | 'mapUrl'
      | 'mapDescription'
      | 'venueName',
    value: string
  ) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      draft.pageData[field] = value;
    });
  };

  const handleMapTemplateApply = (value: string) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      draft.pageData.mapDescription = value;
    });
  };

  const handleKakaoMapFieldChange = (
    field: 'latitude' | 'longitude' | 'level' | 'markerTitle',
    value: string
  ) => {
    updateForm((draft) => {
      if (!draft.pageData?.kakaoMap) {
        return;
      }

      if (field === 'markerTitle') {
        draft.pageData.kakaoMap.markerTitle = value;
        return;
      }

      draft.pageData.kakaoMap[field] = parseNumericInput(
        value,
        draft.pageData.kakaoMap[field] ?? 0
      );
    });
  };

  const handleMetadataFieldChange = (
    group: 'root' | 'images' | 'openGraph' | 'twitter' | 'keywords',
    field: string,
    value: string
  ) => {
    updateForm((draft) => {
      if (group === 'root' && (field === 'title' || field === 'description')) {
        draft.metadata[field] = value;
        return;
      }

      if (group === 'images' && (field === 'wedding' || field === 'favicon')) {
        draft.metadata.images[field] = value;
        return;
      }

      if (
        (group === 'openGraph' || group === 'twitter') &&
        (field === 'title' || field === 'description')
      ) {
        draft.metadata[group][field] = value;
        return;
      }

      if (group === 'keywords') {
        draft.metadata.keywords = textToKeywords(value);
      }
    });
  };

  const handleGalleryImageChange = (index: number, value: string) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      const nextGalleryImages = [...(draft.pageData.galleryImages ?? [])];
      nextGalleryImages[index] = value;
      draft.pageData.galleryImages = nextGalleryImages.slice(0, MAX_GALLERY_IMAGES);
    });
  };

  const handleGalleryImageAdd = () => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      const nextGalleryImages = [...(draft.pageData.galleryImages ?? [])];
      if (nextGalleryImages.length >= MAX_GALLERY_IMAGES) {
        return;
      }

      nextGalleryImages.push('');
      draft.pageData.galleryImages = nextGalleryImages;
    });
  };

  const handleGalleryImageRemove = (index: number) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      draft.pageData.galleryImages = (draft.pageData.galleryImages ?? []).filter(
        (_, imageIndex) => imageIndex !== index
      );
    });
  };

  const handleGalleryImageMove = (index: number, direction: 'up' | 'down') => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      const nextGalleryImages = [...(draft.pageData.galleryImages ?? [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (
        index < 0 ||
        targetIndex < 0 ||
        index >= nextGalleryImages.length ||
        targetIndex >= nextGalleryImages.length
      ) {
        return;
      }

      [nextGalleryImages[index], nextGalleryImages[targetIndex]] = [
        nextGalleryImages[targetIndex],
        nextGalleryImages[index],
      ];
      draft.pageData.galleryImages = nextGalleryImages;
    });
  };

  const handleTriggerImagePicker = (field: UploadFieldKind) => {
    if (!canUploadImages) {
      setNotice({
        tone: 'error',
        message: '이미지 업로드는 Firebase가 켜진 환경에서 편집 권한이 있을 때만 사용할 수 있습니다.',
      });
      return;
    }

    if (field === 'wedding') {
      coverUploadInputRef.current?.click();
      return;
    }

    if (field === 'favicon') {
      faviconUploadInputRef.current?.click();
      return;
    }

    galleryUploadInputRef.current?.click();
  };

  const handleUploadAsset = async (
    field: UploadFieldKind,
    files: File[]
  ) => {
    if (!formState || files.length === 0) {
      return;
    }

    if (!canUploadImages) {
      setNotice({
        tone: 'error',
        message: '이미지 업로드를 사용할 수 없는 환경입니다.',
      });
      return;
    }

    const tokenForUpload = isAdminLoggedIn ? null : editorTokenHash;
    if (!isAdminLoggedIn && !tokenForUpload) {
      setNotice({
        tone: 'error',
        message: '이미지 업로드 전에 먼저 페이지 비밀번호를 확인해 주세요.',
      });
      return;
    }

    setUploadingField(field);

    try {
      if (field === 'gallery') {
        const currentGalleryCount = formState.pageData?.galleryImages?.length ?? 0;
        const remainingSlots = MAX_GALLERY_IMAGES - currentGalleryCount;

        if (remainingSlots <= 0) {
          setNotice({
            tone: 'error',
            message: `갤러리 이미지는 최대 ${MAX_GALLERY_IMAGES}장까지 설정할 수 있습니다.`,
          });
          return;
        }

        const uploadTargets = files.slice(0, remainingSlots);
        const uploadedImages = await Promise.all(
          uploadTargets.map((file) =>
            uploadPageEditorImage(file, slug, 'gallery', tokenForUpload)
          )
        );

        updateForm((draft) => {
          if (!draft.pageData) {
            return;
          }

          draft.pageData.galleryImages = [
            ...(draft.pageData.galleryImages ?? []),
            ...uploadedImages.map((image) => image.url),
          ].slice(0, MAX_GALLERY_IMAGES);
        });

        setNotice({
          tone: 'success',
          message:
            files.length > uploadTargets.length
              ? `갤러리 이미지 ${uploadTargets.length}장만 추가했습니다. 최대 ${MAX_GALLERY_IMAGES}장까지 설정할 수 있습니다.`
              : `갤러리 이미지 ${uploadedImages.length}장을 추가했습니다. 자동 저장이 곧 진행됩니다.`,
        });
        return;
      }

      const uploadTarget = files[0];
      const uploadedImage = await uploadPageEditorImage(
        uploadTarget,
        slug,
        field === 'wedding' ? 'cover' : 'favicon',
        tokenForUpload
      );

      updateForm((draft) => {
        draft.metadata.images[field] = uploadedImage.url;
      });

      setNotice({
        tone: 'success',
        message:
          field === 'wedding'
            ? '대표 이미지를 업로드했습니다. 자동 저장이 곧 진행됩니다.'
            : '파비콘을 업로드했습니다. 자동 저장이 곧 진행됩니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to upload image asset', error);
      setNotice({
        tone: 'error',
        message: '이미지 업로드에 실패했습니다. Storage 규칙과 네트워크 상태를 확인해 주세요.',
      });
    } finally {
      setUploadingField((current) => (current === field ? null : current));
    }
  };

  const handleSingleImageUploadChange = async (
    field: 'wedding' | 'favicon',
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await handleUploadAsset(field, files);
  };

  const handleGalleryUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await handleUploadAsset('gallery', files);
  };

  const handlePersonFieldChange = (
    role: PersonRole,
    field: 'name' | 'order' | 'phone',
    value: string
  ) => {
    updateForm((draft) => {
      draft.couple[role][field] = value;
      if (role === 'groom') {
        draft.groomName = draft.couple.groom.name;
      } else {
        draft.brideName = draft.couple.bride.name;
      }

      if (draft.pageData) {
        draft.pageData[role] = cloneConfig(draft.couple[role]);
      }
    });
  };

  const handleParentFieldChange = (
    role: PersonRole,
    parentRole: ParentRole,
    field: 'relation' | 'name' | 'phone',
    value: string
  ) => {
    updateForm((draft) => {
      const currentParent = draft.couple[role][parentRole];
      draft.couple[role][parentRole] = {
        relation: currentParent?.relation ?? '',
        name: currentParent?.name ?? '',
        phone: currentParent?.phone ?? '',
        [field]: value,
      };

      if (draft.pageData) {
        draft.pageData[role] = cloneConfig(draft.couple[role]);
      }
    });
  };

  const handleGreetingTemplateApply = (value: string) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      draft.pageData.greetingMessage = value;
      if (!hasText(draft.pageData.greetingAuthor)) {
        draft.pageData.greetingAuthor = `${draft.couple.groom.name} · ${draft.couple.bride.name} 드림`;
      }
    });
  };

  const handleGuideAdd = (kind: GuideKind) => {
    const currentItems = formState?.pageData?.[kind] ?? [];
    if (currentItems.length >= MAX_REPEATABLE_ITEMS) {
      setNotice({
        tone: 'error',
        message: `안내 항목은 최대 ${MAX_REPEATABLE_ITEMS}개까지 추가할 수 있습니다.`,
      });
      return;
    }

    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      draft.pageData[kind] = [...(draft.pageData[kind] ?? []), createEmptyGuideItem()];
    });
  };

  const handleGuideRemove = (kind: GuideKind, index: number) => {
    updateForm((draft) => {
      if (!draft.pageData?.[kind]) {
        return;
      }

      draft.pageData[kind] = draft.pageData[kind].filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  const handleGuideChange = (
    kind: GuideKind,
    index: number,
    field: 'title' | 'content',
    value: string
  ) => {
    updateForm((draft) => {
      const target = draft.pageData?.[kind]?.[index];
      if (!target) {
        return;
      }

      target[field] = value;
    });
  };

  const handleAccountAdd = (kind: AccountKind) => {
    const currentAccounts = formState?.pageData?.giftInfo?.[kind] ?? [];
    if (currentAccounts.length >= MAX_REPEATABLE_ITEMS) {
      setNotice({
        tone: 'error',
        message: `계좌는 최대 ${MAX_REPEATABLE_ITEMS}개까지 추가할 수 있습니다.`,
      });
      return;
    }

    updateForm((draft) => {
      if (!draft.pageData?.giftInfo) {
        return;
      }

      draft.pageData.giftInfo[kind] = [
        ...(draft.pageData.giftInfo[kind] ?? []),
        createEmptyAccount(),
      ];
    });
  };

  const handleAccountRemove = (kind: AccountKind, index: number) => {
    updateForm((draft) => {
      if (!draft.pageData?.giftInfo?.[kind]) {
        return;
      }

      draft.pageData.giftInfo[kind] = draft.pageData.giftInfo[kind].filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  const handleAccountChange = (
    kind: AccountKind,
    index: number,
    field: 'bank' | 'accountNumber' | 'accountHolder',
    value: string
  ) => {
    updateForm((draft) => {
      const target = draft.pageData?.giftInfo?.[kind]?.[index];
      if (!target) {
        return;
      }

      target[field] = value;
    });
  };

  const jumpToStep = (stepKey: EditorStepKey) => {
    setActiveStep(stepKey);
    setHighlightedStep(stepKey);
    setWorkspaceView('form');
    setIsStepMenuOpen(false);
  };

  const handlePrimaryAction = async () => {
    if (activeStep === 'final') {
      await handleApplyVisibility();
      return;
    }

    if (nextStepKey) {
      jumpToStep(nextStepKey);
      return;
    }

    jumpToStep('basic');
  };

  const handlePreviousStep = () => {
    if (previousStepKey) {
      jumpToStep(previousStepKey);
    }
  };

  const resetToBaseline = () => {
    if (!baselineState) {
      return;
    }

    setFormState(cloneConfig(baselineState));
    setPublished(baselinePublished);
    setSaveState('idle');
    setNotice({
      tone: 'neutral',
      message: '마지막으로 불러온 상태로 되돌렸습니다.',
    });
  };

  const saveStatusLabel =
    saveState === 'autosaving'
      ? '자동 저장 중'
      : saveState === 'saving'
        ? '임시저장 중'
        : saveState === 'publishing'
          ? '발행 상태 반영 중'
          : saveState === 'saved'
            ? '저장 완료'
            : saveState === 'error'
              ? '저장 오류'
              : isDirty
                ? '저장 필요'
                : '저장 완료';

  const publishStatusLabel = published
    ? hasPublishChanges
      ? '발행 예정'
      : '발행 완료'
    : hasPublishChanges
      ? '비공개 전환 예정'
      : '비공개';

  const renderHeroCard = () => (
    <section className={`${styles.card} ${styles.heroCard}`}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>청첩장 설정 편집기</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>
            1단계부터 순서대로 입력하고, 필요한 항목만 열어 채우면 됩니다.
          </p>
        </div>

        <div className={styles.heroAside}>
          <span className={styles.slugChip}>페이지 주소: /{slug}</span>
          <div className={styles.previewRow}>
            {previewLinks.map((link) => (
              <a
                key={link.href}
                className={styles.previewLink}
                href={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>신랑 · 신부</span>
          <strong className={styles.summaryValue}>
            {formState?.couple.groom.name || initialGroomName || '-'} ·{' '}
            {formState?.couple.bride.name || initialBrideName || '-'}
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>예식 일시</span>
          <strong className={styles.summaryValue}>
            {formState ? weddingSummary : initialDate || '아직 입력되지 않았습니다.'}
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>예식 장소</span>
          <strong className={styles.summaryValue}>
            {formState?.pageData?.venueName || formState?.venue || initialVenue || '아직 입력되지 않았습니다.'}
          </strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>공개 상태</span>
          <strong className={styles.summaryValue}>{publishStatusLabel}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>마지막 저장 시각</span>
          <strong className={styles.summaryValue}>{formatSavedAt(lastSavedAt)}</strong>
        </div>
      </div>
    </section>
  );

  const renderNotice = () =>
    notice ? (
      <div
        className={`${styles.notice} ${
          notice.tone === 'success'
            ? styles.noticeSuccess
            : notice.tone === 'error'
              ? styles.noticeError
              : styles.noticeNeutral
        }`}
      >
        {notice.message}
      </div>
    ) : null;

  const renderGuideCard = () => (
    <section className={`${styles.card} ${styles.sidebarCard}`}>
      <div className={styles.sidebarHeader}>
        <div>
          <p className={styles.sectionEyebrow}>편집 단계</p>
          <h2 className={styles.sectionTitle}>단계 선택</h2>
          <p className={styles.sectionDescription}>
            선택한 단계는 오른쪽에서 입력할 수 있습니다.
          </p>
        </div>
      </div>

      <div className={styles.sidebarMeta}>
        <span className={styles.metaChip}>필수 {completedRequiredFields}/{totalRequiredFields}</span>
        <span className={styles.metaChip}>{saveStatusLabel}</span>
      </div>

      <nav className={styles.sidebarNav} aria-label="편집 단계 이동">
        {EDITOR_STEPS.map((step) => {
          const review = stepReviews[step.key];
          const isCurrent = currentStepKey === step.key;
          const isComplete =
            review.requiredCount === 0 ||
            review.completedRequiredCount === review.requiredCount;

          return (
            <button
              key={step.key}
              type="button"
              className={`${styles.sectionNavLink} ${
                isCurrent ? styles.sectionNavLinkActive : ''
              }`}
              onClick={() => jumpToStep(step.key)}
            >
              <span className={styles.sectionNavStep}>{step.step}</span>
              <span className={styles.sectionNavBody}>
                <span className={styles.sectionNavTitleRow}>
                  <strong className={styles.sectionNavTitle}>{step.title}</strong>
                  {isCurrent ? (
                    <span className={styles.sectionNavCurrentBadge}>현재 편집 중</span>
                  ) : null}
                </span>
                <span className={styles.sectionNavText}>
                  {getStepSummaryText(step, review)}
                </span>
                <span
                  className={
                    isComplete ? styles.sectionNavStateComplete : styles.sectionNavStatePending
                  }
                >
                  {isComplete ? '준비됨' : '입력 필요'}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </section>
  );

  const renderActionBar = (position: 'top' | 'bottom') => (
    <section
      className={`${styles.actionBar} ${
        position === 'top' ? styles.actionBarSticky : styles.actionBarBottom
      }`}
    >
      {position === 'top' ? (
        <>
          <div className={styles.actionMeta}>
            <div className={styles.statusHighlights}>
              <article className={styles.summaryHighlightCard}>
                <span className={styles.summaryHighlightLabel}>저장 상태</span>
                <strong className={styles.summaryHighlightValue}>{saveStatusLabel}</strong>
                <p className={styles.summaryHighlightText}>
                  {saveState === 'error'
                    ? '저장에 실패했습니다. 다시 시도해 주세요.'
                    : isDirty
                      ? '아직 저장하지 않은 변경 사항이 있습니다.'
                      : '현재 화면 기준으로 가장 최근 상태가 저장되어 있습니다.'}
                </p>
              </article>
              <article className={styles.summaryHighlightCard}>
                <span className={styles.summaryHighlightLabel}>공개 상태</span>
                <strong className={styles.summaryHighlightValue}>{publishStatusLabel}</strong>
                <p className={styles.summaryHighlightText}>{publishStatusText}</p>
              </article>
              <article className={styles.summaryHighlightCard}>
                <span className={styles.summaryHighlightLabel}>필수 항목 완료</span>
                <strong className={styles.summaryHighlightValue}>
                  {completedRequiredFields}/{totalRequiredFields} ({progressPercent}%)
                </strong>
                <p className={styles.summaryHighlightText}>{completionStatusText}</p>
              </article>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className={styles.statusGrid}>
              <div className={styles.statusCard}>
                <span className={styles.statusKey}>현재 단계</span>
                <strong className={styles.statusValue}>
                  {`${currentStep.step}. ${currentStep.title}`}
                </strong>
              </div>
              <div className={styles.statusCard}>
                <span className={styles.statusKey}>마지막 저장</span>
                <strong className={styles.statusValue}>{formatSavedAt(lastSavedAt)}</strong>
              </div>
            </div>

            <p className={styles.systemStatusText}>현재 데이터 기준: {systemStatusLabel}</p>
          </div>

          <div className={styles.actionColumn}>
            <div className={styles.actionGroup}>
              <span className={styles.actionGroupLabel}>다음 진행으로 넘어가기</span>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={activeStep === 'final' ? styles.publishButton : styles.primaryButton}
                  onClick={() => void handlePrimaryAction()}
                  disabled={!formState || isSaving || isRestoring || isSavingVisibility}
                >
                  {activeStep === 'final' && isSavingVisibility
                    ? '반영하는 중...'
                    : primaryActionLabel}
                </button>
              </div>
              <p className={styles.actionHint}>{primaryActionHint}</p>
            </div>

            <div className={styles.actionGroup}>
              <span className={styles.actionGroupLabel}>보조</span>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void persistDraft('manual')}
                  disabled={!formState || isSaving || isRestoring}
                >
                  {isSaving ? '임시저장 중...' : '임시저장'}
                </button>
                <a
                  className={styles.secondaryButton}
                  href={currentPreviewHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  전체 미리보기
                </a>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void handleCopyPreviewLink()}
                  disabled={!canCopyPublishedLink}
                >
                  공유 링크 복사
                </button>
              </div>
            </div>

            <div className={styles.utilityRow}>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  disabled={!formState || isSaving || isRestoring || isSavingVisibility}
                />
                <span>저장 후 공개 페이지로 노출하기</span>
              </label>

              <details className={styles.actionDetails}>
                <summary className={styles.actionDetailsSummary}>복구 / 초기화 옵션</summary>
                <div className={styles.actionDetailsBody}>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => void handleRefresh()}
                      disabled={!formState || isSaving || isRestoring || isRefreshing}
                    >
                      {isRefreshing ? '다시 불러오는 중...' : '다시 불러오기'}
                    </button>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={resetToBaseline}
                      disabled={!formState || !isDirty || isSaving || isRestoring}
                    >
                      변경 취소
                    </button>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => void handleRestore()}
                      disabled={!formState || isSaving || isRestoring}
                    >
                      {isRestoring ? '복원 중...' : '기본값 복원'}
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.bottomBarMeta}>
            <span className={styles.statusPill}>현재 단계: {currentStep.step}. {currentStep.title}</span>
            {nextStep ? (
              <span className={styles.statusPill}>다음 단계: {nextStep.step}. {nextStep.title}</span>
            ) : (
              <span className={`${styles.statusPill} ${styles.statusPillSuccess}`}>마지막 단계</span>
            )}
          </div>

          <div className={styles.bottomActionRow}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={handlePreviousStep}
              disabled={!previousStep}
            >
              {previousStep ? `${previousStep.step}. 이전 단계` : '이전 단계 없음'}
            </button>
            <button
              type="button"
              className={activeStep === 'final' ? styles.publishButton : styles.primaryButton}
              onClick={() => void handlePrimaryAction()}
              disabled={!formState || isSaving || isRestoring || isSavingVisibility}
            >
              {activeStep === 'final' && isSavingVisibility
                ? '반영하는 중...'
                : primaryActionLabel}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void persistDraft('manual')}
              disabled={!formState || isSaving || isRestoring}
            >
              {isSaving ? '임시저장 중...' : '임시저장'}
            </button>
          </div>
        </>
      )}
    </section>
  );

  const renderPreviewThemeTabs = () => (
    <div className={styles.editorTabs} role="tablist" aria-label="미리보기 테마 선택">
      <button
        type="button"
        role="tab"
        aria-selected={previewTheme === 'emotional'}
        className={`${styles.editorTab} ${
          previewTheme === 'emotional' ? styles.editorTabActive : ''
        }`}
        onClick={() => setPreviewTheme('emotional')}
      >
        감성형
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={previewTheme === 'simple'}
        className={`${styles.editorTab} ${
          previewTheme === 'simple' ? styles.editorTabActive : ''
        }`}
        onClick={() => setPreviewTheme('simple')}
      >
        심플형
      </button>
    </div>
  );

  const renderCurrentSectionContent = (stepKey: EditorStepKey): ReactNode => {
    switch (stepKey) {
      case 'basic':
        return renderBasicInfoSection();
      case 'schedule':
        return renderScheduleSection();
      case 'venue':
        return renderVenueSection();
      case 'greeting':
        return renderGreetingSection();
      case 'gallery':
        return renderGallerySection();
      case 'gift':
        return renderGiftSection();
      case 'final':
        return renderFinalSection();
      default:
        return null;
    }
  };

  const renderWorkspacePanel = () => (
    <section className={`${styles.card} ${styles.workspaceCard}`}>
      <div className={styles.workspaceHeader}>
        <div className={styles.workspaceTitleBlock}>
          <div className={styles.sectionHeaderMain}>
            <span className={styles.sectionGroupStep}>{currentStep.step}</span>
            <div className={styles.sectionGroupText}>
              <div className={styles.sectionTitleRow}>
                <strong className={styles.sectionGroupTitle}>{currentStep.title}</strong>
                <span
                  className={
                    currentStep.isOptional
                      ? styles.fieldBadgeOptional
                      : styles.fieldBadgeRequired
                  }
                >
                  {currentStep.isOptional ? '선택' : '필수'}
                </span>
                <span
                  className={
                    currentReview.requiredCount === 0 ||
                    currentReview.completedRequiredCount === currentReview.requiredCount
                      ? styles.sectionStateSuccess
                      : styles.sectionStateWarning
                  }
                >
                  {currentReview.requiredCount === 0 ||
                  currentReview.completedRequiredCount === currentReview.requiredCount
                    ? '입력 완료'
                    : getStepSummaryText(currentStep, currentReview)}
                </span>
              </div>
              <p className={styles.sectionGroupDescription}>{currentStep.description}</p>
              <p className={styles.sectionCriteriaText}>
                {getStepCriteriaText(currentStep, currentReview)}
              </p>
              {currentReview.missing.length > 0 ? (
                <p className={styles.sectionIssueText}>
                  아직 필요한 항목: {currentReview.missing.join(', ')}
                </p>
              ) : null}
              {currentReview.warnings.length > 0 ? (
                <p className={styles.sectionWarningText}>{currentReview.warnings[0]}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.workspaceTabBar}>
        <div className={styles.editorTabs} role="tablist" aria-label="편집 보기 전환">
          <button
            type="button"
            role="tab"
            aria-selected={workspaceView === 'form'}
            className={`${styles.editorTab} ${
              workspaceView === 'form' ? styles.editorTabActive : ''
            }`}
            onClick={() => setWorkspaceView('form')}
          >
            입력하기
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceView === 'preview'}
            className={`${styles.editorTab} ${
              workspaceView === 'preview' ? styles.editorTabActive : ''
            }`}
            onClick={() => setWorkspaceView('preview')}
          >
            미리보기
          </button>
        </div>

        {workspaceView === 'preview' ? (
          renderPreviewThemeTabs()
        ) : (
          <span className={styles.metaChip}>필수 내용을 입력해주세요.</span>
        )}
      </div>

      {workspaceView === 'form' ? (
        <div
          className={styles.workspacePane}
          onFocusCapture={() => setHighlightedStep(currentStepKey)}
        >
          {renderCurrentSectionContent(currentStepKey)}
        </div>
      ) : formState ? (
        <div className={styles.workspacePane}>
          <PageEditorSectionPreview
            section={currentStep.previewSection}
            theme={previewTheme}
            slug={slug}
            formState={formState}
            published={published}
            highlighted={highlightedStep === currentStepKey || workspaceView === 'preview'}
            onRequestEdit={() => setWorkspaceView('form')}
          />
        </div>
      ) : null}
    </section>
  );

  const renderFloatingMobileStepButton = () => (
    <button
      type="button"
      className={styles.mobileStepButton}
      onClick={() => setIsStepMenuOpen(true)}
      aria-label="편집 단계 선택 메뉴 열기"
    >
      <span className={styles.mobileStepButtonIcon}>☰</span>
      <span>현재 {currentStep.step}단계</span>
    </button>
  );

  const renderMobileStepMenu = () =>
    isStepMenuOpen ? (
      <div
        className={styles.mobileStepMenuBackdrop}
        onClick={() => setIsStepMenuOpen(false)}
      >
        <section
          className={styles.mobileStepMenu}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.mobileStepMenuHandle} />
          <div className={styles.mobileStepMenuHeader}>
            <div>
              <p className={styles.sectionEyebrow}>단계 선택</p>
              <h2 className={styles.sectionTitle}>편집할 단계를 골라 이동하세요</h2>
            </div>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setIsStepMenuOpen(false)}
            >
              닫기
            </button>
          </div>

          <div className={styles.mobileStepMenuMeta}>
            <span className={styles.metaChip}>현재 {currentStep.step}. {currentStep.title}</span>
            <span className={styles.metaChip}>필수 {completedRequiredFields}/{totalRequiredFields}</span>
            <span className={styles.metaChip}>{saveStatusLabel}</span>
          </div>

          <nav className={styles.sidebarNav} aria-label="모바일 편집 단계 이동">
            {EDITOR_STEPS.map((step) => {
              const review = stepReviews[step.key];
              const isCurrent = currentStepKey === step.key;
              const isComplete =
                review.requiredCount === 0 ||
                review.completedRequiredCount === review.requiredCount;

              return (
                <button
                  key={step.key}
                  type="button"
                  className={`${styles.sectionNavLink} ${
                    isCurrent ? styles.sectionNavLinkActive : ''
                  }`}
                  onClick={() => jumpToStep(step.key)}
                >
                  <span className={styles.sectionNavStep}>{step.step}</span>
                  <span className={styles.sectionNavBody}>
                    <span className={styles.sectionNavTitleRow}>
                      <strong className={styles.sectionNavTitle}>{step.title}</strong>
                      {isCurrent ? (
                        <span className={styles.sectionNavCurrentBadge}>현재 편집 중</span>
                      ) : null}
                    </span>
                    <span className={styles.sectionNavText}>
                      {getStepSummaryText(step, review)}
                    </span>
                    <span
                      className={
                        isComplete
                          ? styles.sectionNavStateComplete
                          : styles.sectionNavStatePending
                      }
                    >
                      {isComplete ? '준비됨' : '입력 필요'}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </section>
      </div>
    ) : null;

  const renderBasicInfoSection = () => {
    if (!formState) {
      return null;
    }

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>표지에 가장 먼저 보이는 정보</h2>
            <p className={styles.sectionDescription}>
              청첩장 이름과 소개 문구는 첫 화면에서 가장 먼저 보이는 핵심 문구입니다.
            </p>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {renderFieldMeta(
              '청첩장 이름',
              'required',
              '신랑 · 신부 이름이 함께 보이도록 입력해 주세요.'
            )}
            <input
              className={styles.input}
              value={formState.displayName}
              placeholder="예: 신민제 ♥ 김현지"
              onChange={(event) =>
                handleTopLevelFieldChange('displayName', event.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta(
              '표지 보조 문구',
              'optional',
              '두 사람이 사랑으로 하나가 되는 날 같은 짧은 문구를 넣을 수 있습니다.'
            )}
            <input
              className={styles.input}
              value={formState.pageData?.subtitle ?? ''}
              placeholder="예: 두 사람이 사랑으로 하나가 되는 날"
              onChange={(event) =>
                handlePageDataFieldChange('subtitle', event.target.value)
              }
            />
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            {renderFieldMeta(
              '소개 문구',
              'required',
              '검색 결과와 첫 화면 소개에 함께 쓰이는 문구입니다.'
            )}
            <textarea
              className={styles.textarea}
              value={formState.description}
              placeholder="예: 사랑으로 하나가 되는 날, 소중한 분들을 초대합니다."
              onChange={(event) =>
                handleTopLevelFieldChange('description', event.target.value)
              }
            />
          </label>
        </div>
      </section>
    );
  };

  const renderScheduleSection = () => {
    if (!formState) {
      return null;
    }

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>날짜와 시간 입력</h2>
            <p className={styles.sectionDescription}>
              날짜와 시간을 정확히 입력하면 표지 문구와 달력 미리보기가 함께 업데이트됩니다.
            </p>
          </div>
        </div>

        <div className={styles.dualGrid}>
          <label className={styles.field}>
            {renderFieldMeta(
              '예식 날짜',
              'required',
              '달력에서 날짜를 선택하면 자동으로 대표 날짜 문구가 바뀝니다.'
            )}
            <input
              className={styles.input}
              type="date"
              value={formatDateInputValue(formState)}
              onChange={(event) => handleDateInputChange(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta(
              '예식 시간',
              'required',
              '30분 단위나 정각처럼 실제 진행 시간을 입력해 주세요.'
            )}
            <input
              className={styles.input}
              type="time"
              value={formatTimeInputValue(formState)}
              onChange={(event) => handleTimeInputChange(event.target.value)}
            />
          </label>
        </div>

        <div className={styles.summaryHighlightCard}>
          <span className={styles.summaryHighlightLabel}>문장형 요약</span>
          <strong className={styles.summaryHighlightValue}>{weddingSummary}</strong>
          <p className={styles.summaryHighlightText}>
            손님이 읽는 날짜 문구와 카운트다운 계산은 이 값을 기준으로 맞춰집니다.
          </p>
        </div>

        <details className={styles.detailsGroup}>
          <summary className={styles.detailsSummary}>표지에 보이는 날짜 문구 직접 수정</summary>
          <div className={styles.detailsBody}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                {renderFieldMeta(
                  '대표 날짜 문구',
                  'required',
                  '자동 생성된 문구를 조금 다르게 표현하고 싶을 때만 수정해 주세요.'
                )}
                <input
                  className={styles.input}
                  value={formState.date}
                  placeholder="예: 2026년 4월 14일 화요일"
                  onChange={(event) => handleManualDateTextChange(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                {renderFieldMeta(
                  '표시 시간 문구',
                  'optional',
                  '오후 3시, 오후 3시 30분처럼 손님에게 보일 시간 표현입니다.'
                )}
                <input
                  className={styles.input}
                  value={formState.pageData?.ceremonyTime ?? ''}
                  placeholder="예: 오후 3시"
                  onChange={(event) =>
                    handlePageDataFieldChange('ceremonyTime', event.target.value)
                  }
                />
              </label>
            </div>
          </div>
        </details>
      </section>
    );
  };

  const renderVenueSection = () => {
    if (!formState) {
      return null;
    }

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>예식장과 교통 안내</h2>
            <p className={styles.sectionDescription}>
              손님이 길을 헤매지 않도록 홀 이름, 주소, 오시는 길 문구를 분리해서 입력해 주세요.
            </p>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {renderFieldMeta(
              '예식장 이름',
              'required',
              '첫 화면과 일정 카드에 반복해서 노출되는 메인 장소 이름입니다.'
            )}
            <input
              className={styles.input}
              value={formState.venue}
              placeholder="예: 더케이웨딩홀"
              onChange={(event) => handleTopLevelFieldChange('venue', event.target.value)}
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta(
              '홀 또는 표시 장소명',
              'required',
              '층수, 홀 이름, 별관 정보처럼 손님이 실제로 찾을 이름을 적어 주세요.'
            )}
            <input
              className={styles.input}
              value={formState.pageData?.venueName ?? ''}
              placeholder="예: 더케이웨딩홀 3층 그랜드홀"
              onChange={(event) =>
                handlePageDataFieldChange('venueName', event.target.value)
              }
            />
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            {renderFieldMeta(
              '예식장 주소',
              'required',
              '길찾기 복사에 바로 쓸 수 있도록 상세 주소까지 입력해 주세요.'
            )}
            <input
              className={styles.input}
              value={formState.pageData?.ceremonyAddress ?? ''}
              placeholder="예: 서울특별시 강남구 ..."
              onChange={(event) =>
                handlePageDataFieldChange('ceremonyAddress', event.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta(
              '예식장 연락처',
              'optional',
              '안내 데스크나 예식장 대표번호를 공개할 때만 적어 주세요.'
            )}
            <input
              className={styles.input}
              value={formState.pageData?.ceremonyContact ?? ''}
              placeholder="예: 02-123-4567"
              onChange={(event) =>
                handlePageDataFieldChange('ceremonyContact', event.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta(
              '지도 링크',
              'optional',
              '카카오맵 또는 네이버지도 링크를 붙여 넣으면 좋습니다.'
            )}
            <input
              className={styles.input}
              value={formState.pageData?.mapUrl ?? ''}
              placeholder="예: https://map.kakao.com/..."
              onChange={(event) => handlePageDataFieldChange('mapUrl', event.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            {renderFieldMeta(
              '오시는 길 요약 문구',
              'optional',
              '주차, 지하철, 건물 위치처럼 꼭 필요한 안내만 짧게 적어 주세요.'
            )}
            <textarea
              className={styles.textarea}
              value={formState.pageData?.mapDescription ?? ''}
              placeholder="예: 지하철 2호선에서 도보 5분, 건물 내 주차 가능"
              onChange={(event) =>
                handlePageDataFieldChange('mapDescription', event.target.value)
              }
            />
          </label>
        </div>

        <div className={styles.templateRow}>
          {TRANSPORT_GUIDE_TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              className={styles.templateButton}
              onClick={() => handleMapTemplateApply(template.value)}
            >
              {template.label}
            </button>
          ))}
        </div>

        <details className={styles.detailsGroup}>
          <summary className={styles.detailsSummary}>오시는 길 상세 안내 항목 추가</summary>
          <div className={styles.detailsBody}>
            <GuideSectionPanel
              kind="venueGuide"
              title="오시는 길 상세 안내"
              description="주차, 리셉션, 식사 안내처럼 손님 방문에 필요한 정보를 항목별로 작성합니다."
              items={formState.pageData?.venueGuide ?? []}
              disabled={false}
              onAdd={handleGuideAdd}
              onRemove={handleGuideRemove}
              onChange={handleGuideChange}
            />
            <GuideSectionPanel
              kind="wreathGuide"
              title="화환 안내"
              description="화환 접수와 배송 시간 등 별도 안내가 필요하다면 여기에 정리해 주세요."
              items={formState.pageData?.wreathGuide ?? []}
              disabled={false}
              onAdd={handleGuideAdd}
              onRemove={handleGuideRemove}
              onChange={handleGuideChange}
            />
          </div>
        </details>

        <details className={styles.detailsGroup}>
          <summary className={styles.detailsSummary}>서비스용 카카오 지도 좌표 수정</summary>
          <div className={styles.detailsBody}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                {renderFieldMeta('위도', 'optional')}
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={String(formState.pageData?.kakaoMap?.latitude ?? 0)}
                  placeholder="예: 37.5665"
                  onChange={(event) =>
                    handleKakaoMapFieldChange('latitude', event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('경도', 'optional')}
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={String(formState.pageData?.kakaoMap?.longitude ?? 0)}
                  placeholder="예: 126.978"
                  onChange={(event) =>
                    handleKakaoMapFieldChange('longitude', event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('확대 레벨', 'optional')}
                <input
                  className={styles.input}
                  inputMode="numeric"
                  value={String(formState.pageData?.kakaoMap?.level ?? 3)}
                  placeholder="예: 3"
                  onChange={(event) =>
                    handleKakaoMapFieldChange('level', event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('지도 마커 이름', 'optional')}
                <input
                  className={styles.input}
                  value={formState.pageData?.kakaoMap?.markerTitle ?? ''}
                  placeholder="예: 더케이웨딩홀"
                  onChange={(event) =>
                    handleKakaoMapFieldChange('markerTitle', event.target.value)
                  }
                />
              </label>
            </div>
          </div>
        </details>
      </section>
    );
  };

  const renderGreetingSection = () => {
    if (!formState) {
      return null;
    }

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>신랑 · 신부 정보와 인사말</h2>
            <p className={styles.sectionDescription}>
              이름과 인사말은 꼭 입력하고, 부모님 연락처나 호칭은 필요할 때만 추가해 주세요.
            </p>
          </div>
        </div>

        <div className={styles.dualGrid}>
          <PersonEditorCard
            role="groom"
            label="신랑 정보"
            person={formState.couple.groom}
            disabled={false}
            onPersonFieldChange={handlePersonFieldChange}
            onParentFieldChange={handleParentFieldChange}
          />
          <PersonEditorCard
            role="bride"
            label="신부 정보"
            person={formState.couple.bride}
            disabled={false}
            onPersonFieldChange={handlePersonFieldChange}
            onParentFieldChange={handleParentFieldChange}
          />
        </div>

        <div className={styles.subCard}>
          <div className={styles.subCardHeader}>
            <div>
              <h3 className={styles.subCardTitle}>인사말 문구</h3>
              <p className={styles.subCardDescription}>
                직접 쓰기 어렵다면 아래 템플릿을 고른 뒤 자연스럽게 다듬어 주세요.
              </p>
            </div>
          </div>

          <div className={styles.templateRow}>
            {GREETING_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className={styles.templateButton}
                onClick={() => handleGreetingTemplateApply(template.value)}
              >
                {template.label}
              </button>
            ))}
          </div>

          <div className={styles.fieldGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              {renderFieldMeta(
                '인사말 본문',
                'required',
                '권장 길이는 60자에서 120자 사이입니다.'
              )}
              <textarea
                className={styles.textarea}
                value={formState.pageData?.greetingMessage ?? ''}
                placeholder="예: 저희 두 사람의 소중한 시작을 함께 축복해 주세요."
                onChange={(event) =>
                  handlePageDataFieldChange('greetingMessage', event.target.value)
                }
              />
            </label>

            <label className={styles.field}>
              {renderFieldMeta(
                '인사말 서명',
                'optional',
                '예: 신민제 · 김현지 드림'
              )}
              <input
                className={styles.input}
                value={formState.pageData?.greetingAuthor ?? ''}
                placeholder="예: 신민제 · 김현지 드림"
                onChange={(event) =>
                  handlePageDataFieldChange('greetingAuthor', event.target.value)
                }
              />
            </label>
          </div>
        </div>
      </section>
    );
  };

  const renderGallerySection = () => {
    if (!formState) {
      return null;
    }

    const galleryImages = formState.pageData?.galleryImages ?? [];
    const canAddGalleryField = galleryImages.length < MAX_GALLERY_IMAGES;
    const isUploadingCover = uploadingField === 'wedding';
    const isUploadingGallery = uploadingField === 'gallery';

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.sectionTitle}>대표 이미지와 갤러리 첫 화면</h2>
              <span className={styles.fieldBadgeOptional}>선택</span>
            </div>
            <p className={styles.sectionDescription}>
              대표 이미지는 첫 화면과 공유 카드에 사용되고, 갤러리 이미지는 페이지 사진 영역에 순서대로 노출됩니다.
            </p>
          </div>
        </div>

        <div className={styles.subCard}>
          <div className={styles.subCardHeader}>
            <div>
              <h3 className={styles.subCardTitle}>대표 이미지</h3>
              <p className={styles.subCardDescription}>
                표지, 공유 카드, 일부 미리보기에서 먼저 보여줄 이미지를 지정합니다.
              </p>
            </div>
            <div className={styles.inlineField}>
              <input
                ref={coverUploadInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                onChange={(event) => void handleSingleImageUploadChange('wedding', event)}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => handleTriggerImagePicker('wedding')}
                disabled={!canUploadImages || isUploadingCover}
              >
                {isUploadingCover ? '업로드 중..' : '이미지 업로드'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => handleMetadataFieldChange('images', 'wedding', '')}
                disabled={!formState.metadata.images.wedding}
              >
                비우기
              </button>
            </div>
          </div>

          <div className={styles.assetUploadPreview}>
            {formState.metadata.images.wedding ? (
              <img
                className={styles.assetPreviewImage}
                src={formState.metadata.images.wedding}
                alt="대표 이미지 미리보기"
              />
            ) : (
              <div className={styles.assetPreviewPlaceholder}>
                대표 이미지를 업로드하면 여기에서 바로 확인할 수 있습니다.
              </div>
            )}
          </div>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            {renderFieldMeta(
              '대표 이미지 주소',
              'optional',
              '직접 업로드하지 않아도 외부 이미지 주소를 붙여 넣어 사용할 수 있습니다.'
            )}
            <input
              className={styles.input}
              value={formState.metadata.images.wedding}
              placeholder="예: https://.../cover.jpg"
              onChange={(event) =>
                handleMetadataFieldChange('images', 'wedding', event.target.value)
              }
            />
          </label>
        </div>

        <div className={styles.subCard}>
          <div className={styles.subCardHeader}>
            <div>
              <h3 className={styles.subCardTitle}>갤러리 이미지</h3>
              <p className={styles.subCardDescription}>
                고객이 보는 사진 순서대로 최대 {MAX_GALLERY_IMAGES}장까지 배치할 수 있습니다.
              </p>
              <p className={styles.countText}>
                현재 {galleryImages.length} / {MAX_GALLERY_IMAGES}장
              </p>
            </div>
            <div className={styles.inlineField}>
              <input
                ref={galleryUploadInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => void handleGalleryUploadChange(event)}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => handleTriggerImagePicker('gallery')}
                disabled={!canUploadImages || !canAddGalleryField || isUploadingGallery}
              >
                {isUploadingGallery ? '업로드 중..' : '갤러리 업로드'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleGalleryImageAdd}
                disabled={!canAddGalleryField}
              >
                URL 직접 추가
              </button>
            </div>
          </div>

          <div className={styles.stackColumn}>
            {galleryImages.length > 0 ? (
              galleryImages.map((imageUrl, index) => (
                <div key={`gallery-image-${index}`} className={styles.assetListItem}>
                  <div className={styles.assetListPreview}>
                    {imageUrl ? (
                      <img
                        className={styles.assetListImage}
                        src={imageUrl}
                        alt={`갤러리 이미지 ${index + 1}`}
                      />
                    ) : (
                      <div className={styles.assetListPlaceholder}>이미지 {index + 1}</div>
                    )}
                  </div>
                  <div className={styles.assetListBody}>
                    <div className={styles.assetListHeader}>
                      <strong className={styles.assetListTitle}>갤러리 이미지 {index + 1}</strong>
                      <div className={styles.assetListActions}>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => handleGalleryImageMove(index, 'up')}
                          disabled={index === 0}
                        >
                          위로
                        </button>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => handleGalleryImageMove(index, 'down')}
                          disabled={index === galleryImages.length - 1}
                        >
                          아래로
                        </button>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => handleGalleryImageRemove(index)}
                        >
                          제거
                        </button>
                      </div>
                    </div>
                    <label className={styles.field}>
                      {renderFieldMeta(
                        '이미지 주소',
                        'optional',
                        '업로드 후 자동 입력되며, 필요하면 외부 이미지 주소로 직접 바꿀 수 있습니다.'
                      )}
                      <input
                        className={styles.input}
                        value={imageUrl}
                        placeholder="예: https://.../gallery-01.jpg"
                        onChange={(event) =>
                          handleGalleryImageChange(index, event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyCard}>
                아직 등록된 갤러리 이미지가 없습니다. 업로드하거나 URL을 직접 추가해 주세요.
              </div>
            )}
          </div>
        </div>

        <div className={styles.guideListCard}>
          <strong className={styles.guideTitle}>이미지 가이드</strong>
          <ul className={styles.guideBulletList}>
            {GALLERY_GUIDE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.sectionDescription}>
            이제 파일 이름 규칙이 아니라 설정된 이미지 주소 기준으로 노출합니다. 기존 Firestore 문서도 여기서 바로 수정해 새 구조로 저장할 수 있습니다.
          </p>
        </div>
      </section>
    );
  };

  const renderGiftSection = () => {
    if (!formState) {
      return null;
    }

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.sectionTitle}>축의금과 계좌 안내</h2>
              <span className={styles.fieldBadgeOptional}>선택</span>
            </div>
            <p className={styles.sectionDescription}>
              민감한 정보이므로 꼭 필요한 경우에만 입력하고, 은행명 · 계좌번호 · 예금주를 한 세트로 작성해 주세요.
            </p>
          </div>
        </div>

        <div className={styles.subCard}>
          <div className={styles.subCardHeader}>
            <div>
              <h3 className={styles.subCardTitle}>계좌 안내 문구</h3>
              <p className={styles.subCardDescription}>
                계좌 영역 상단에 노출할 설명 문구를 입력합니다.
              </p>
            </div>
          </div>

          <label className={styles.field}>
            {renderFieldMeta(
              '안내 문구',
              'optional',
              '예: 참석이 어려우신 분들을 위해 계좌번호를 함께 안내드립니다.'
            )}
            <textarea
              className={styles.textarea}
              value={formState.pageData?.giftInfo?.message ?? ''}
              placeholder="예: 참석이 어려우신 분들을 위해 계좌번호를 함께 안내드립니다."
              onChange={(event) =>
                updateForm((draft) => {
                  if (!draft.pageData?.giftInfo) {
                    return;
                  }
                  draft.pageData.giftInfo.message = event.target.value;
                })
              }
            />
          </label>
        </div>

        <div className={styles.dualGrid}>
          <AccountSectionPanel
            kind="groomAccounts"
            title="신랑측 계좌"
            description="신랑 본인과 가족 계좌를 순서대로 입력해 주세요."
            accounts={formState.pageData?.giftInfo?.groomAccounts ?? []}
            disabled={false}
            onAdd={handleAccountAdd}
            onRemove={handleAccountRemove}
            onChange={handleAccountChange}
          />
          <AccountSectionPanel
            kind="brideAccounts"
            title="신부측 계좌"
            description="신부 본인과 가족 계좌를 순서대로 입력해 주세요."
            accounts={formState.pageData?.giftInfo?.brideAccounts ?? []}
            disabled={false}
            onAdd={handleAccountAdd}
            onRemove={handleAccountRemove}
            onChange={handleAccountChange}
          />
        </div>
      </section>
    );
  };

  const renderFinalSection = () => {
    if (!formState) {
      return null;
    }

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>검색 · 공유 문구와 최종 점검</h2>
            <p className={styles.sectionDescription}>
              링크를 공유했을 때 보이는 제목과 설명을 먼저 정리한 뒤, 발행 상태를 마지막으로 확인해 주세요.
            </p>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {renderFieldMeta(
              '브라우저 제목',
              'required',
              '검색 결과와 브라우저 탭에 보여줄 제목입니다.'
            )}
            <input
              className={styles.input}
              value={formState.metadata.title}
              placeholder="예: 신민제 ♥ 김현지 결혼식에 초대합니다"
              onChange={(event) =>
                handleMetadataFieldChange('root', 'title', event.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            {renderFieldMeta(
              '대표 설명 문구',
              'required',
              '공유 카드와 검색 결과 요약에 쓰입니다.'
            )}
            <input
              className={styles.input}
              value={formState.metadata.description}
              placeholder="예: 2026년 4월 14일, 소중한 분들을 초대합니다."
              onChange={(event) =>
                handleMetadataFieldChange('root', 'description', event.target.value)
              }
            />
          </label>

          <div className={`${styles.field} ${styles.fieldWide}`}>
            {renderFieldMeta(
              '파비콘 주소',
              'required',
              '브라우저 탭 아이콘으로 사용됩니다.'
            )}
            <div className={styles.assetInlineActions}>
              <input
                ref={faviconUploadInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                onChange={(event) => void handleSingleImageUploadChange('favicon', event)}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => handleTriggerImagePicker('favicon')}
                disabled={!canUploadImages || uploadingField === 'favicon'}
              >
                {uploadingField === 'favicon' ? '업로드 중..' : '파비콘 업로드'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => handleMetadataFieldChange('images', 'favicon', '')}
                disabled={!formState.metadata.images.favicon}
              >
                비우기
              </button>
            </div>
            <div className={styles.faviconPreviewRow}>
              {formState.metadata.images.favicon ? (
                <img
                  className={styles.faviconPreviewImage}
                  src={formState.metadata.images.favicon}
                  alt="파비콘 미리보기"
                />
              ) : (
                <div className={styles.assetPreviewPlaceholder}>
                  파비콘을 업로드하면 검색/공유 미리보기에도 함께 반영됩니다.
                </div>
              )}
            </div>
            <input
              className={styles.input}
              value={formState.metadata.images.favicon}
              placeholder="예: https://.../favicon.png"
              onChange={(event) =>
                handleMetadataFieldChange('images', 'favicon', event.target.value)
              }
            />
          </div>
        </div>

        <details className={styles.detailsGroup}>
          <summary className={styles.detailsSummary}>SNS 전용 문구와 검색 키워드 추가 설정</summary>
          <div className={styles.detailsBody}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                {renderFieldMeta('오픈그래프 제목', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.openGraph.title}
                  placeholder="예: 신민제 ♥ 김현지 결혼식"
                  onChange={(event) =>
                    handleMetadataFieldChange('openGraph', 'title', event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('오픈그래프 설명', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.openGraph.description}
                  placeholder="예: 링크 공유 시 보여줄 설명을 입력해 주세요."
                  onChange={(event) =>
                    handleMetadataFieldChange(
                      'openGraph',
                      'description',
                      event.target.value
                    )
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('트위터 제목', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.twitter.title}
                  placeholder="예: 신민제 ♥ 김현지 결혼식"
                  onChange={(event) =>
                    handleMetadataFieldChange('twitter', 'title', event.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                {renderFieldMeta('트위터 설명', 'optional')}
                <input
                  className={styles.input}
                  value={formState.metadata.twitter.description}
                  placeholder="예: 트위터 공유 시 보여줄 설명을 입력해 주세요."
                  onChange={(event) =>
                    handleMetadataFieldChange(
                      'twitter',
                      'description',
                      event.target.value
                    )
                  }
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                {renderFieldMeta('검색 키워드', 'optional', '쉼표로 구분해서 입력해 주세요.')}
                <input
                  className={styles.input}
                  value={keywordsToText(formState.metadata.keywords)}
                  onChange={(event) =>
                    handleMetadataFieldChange('keywords', 'keywords', event.target.value)
                  }
                  placeholder="예: 결혼식, 모바일 청첩장, 신민제 김현지"
                />
              </label>
            </div>
          </div>
        </details>

        <div className={styles.guideListCard}>
          <strong className={styles.guideTitle}>발행 전 체크리스트</strong>
          <ul className={styles.guideBulletList}>
            <li>신랑 · 신부 이름, 날짜, 장소, 인사말이 모두 들어갔는지 확인해 주세요.</li>
            <li>대표 이미지와 공유 카드 문구가 원하는 분위기인지 미리보기로 확인해 주세요.</li>
            <li>비공개 상태에서 충분히 점검한 뒤 발행하기 버튼을 눌러 주세요.</li>
          </ul>
        </div>
      </section>
    );
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {canEdit && formState ? (
          <>
            {renderHeroCard()}
            {renderNotice()}
            <div className={styles.editorLayout}>
              <aside className={styles.editorSidebar}>{renderGuideCard()}</aside>
              <section className={styles.editorMain}>
                {renderActionBar('top')}
                {renderWorkspacePanel()}
                {renderActionBar('bottom')}
              </section>
            </div>
            {renderFloatingMobileStepButton()}
            {renderMobileStepMenu()}
          </>
        ) : (
          <>
            {renderHeroCard()}
            {renderNotice()}

            {!canEdit ? (
              <section className={styles.lockedCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.lockedTitle}>편집 비밀번호 확인</h2>
                    <p className={styles.lockedText}>
                      고객용 설정 편집기는 페이지별 비밀번호로 보호됩니다. 관리자 로그인 중이라면 별도 비밀번호 없이 수정할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className={styles.authGrid}>
                  <label className={styles.field}>
                    {renderFieldMeta('페이지 비밀번호', 'required')}
                    <input
                      className={styles.input}
                      type="password"
                      value={passwordInput}
                      onChange={(event) => setPasswordInput(event.target.value)}
                      placeholder="관리자에게 전달받은 비밀번호를 입력해 주세요"
                    />
                  </label>
                </div>

                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void handleUnlock()}
                    disabled={isUnlocking}
                  >
                    {isUnlocking ? '확인하는 중...' : '편집 시작하기'}
                  </button>
                </div>
              </section>
            ) : null}

            {canEdit && isLoading ? (
              <section className={styles.lockedCard}>
                <h2 className={styles.lockedTitle}>설정 정보를 불러오는 중입니다.</h2>
                <p className={styles.lockedText}>
                  잠시만 기다려 주세요. 저장된 청첩장 설정을 확인하고 있습니다.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
