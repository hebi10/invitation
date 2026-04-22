import { findInvitationMusicTrackById } from '@/lib/musicLibrary';
import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  EDITOR_STEPS,
  hasText,
  isValidPhone,
  isValidUrl,
  type EditorStepKey,
  type StepDefinition,
} from './pageEditorContent';

export const MAX_REPEATABLE_ITEMS = 3;

export type StepReview = {
  requiredCount: number;
  completedRequiredCount: number;
  missing: string[];
  warnings: string[];
  isOptional: boolean;
};

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

export function formatDateInputValue(formState: InvitationPageSeed) {
  const date = buildWeddingDateObject(formState);
  if (!date) {
    return '';
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeInputValue(formState: InvitationPageSeed) {
  const date = buildWeddingDateObject(formState);
  if (!date) {
    return '';
  }

  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export function buildWeddingSummary(formState: InvitationPageSeed) {
  const date = buildWeddingDateObject(formState);
  if (!date) {
    return '예식 날짜와 시간을 입력하면 문구 요약이 여기에 표시됩니다.';
  }

  return `${formatWeddingDateLabel(date)} ${formatWeddingTimeLabel(date)}`;
}

export function syncWeddingPresentation(draft: InvitationPageSeed) {
  if (!draft.pageData) {
    return;
  }

  const date = buildWeddingDateObject(draft);
  if (!date) {
    return;
  }

  draft.date = formatWeddingDateLabel(date);
  draft.pageData.ceremonyTime = formatWeddingTimeLabel(date);
  draft.pageData.ceremony = {
    ...draft.pageData.ceremony,
    time: formatWeddingTimeLabel(date),
    location:
      draft.pageData.ceremony?.location ||
      draft.pageData.ceremonyAddress ||
      draft.pageData.venueName ||
      draft.venue,
  };
}

export function formatSavedAt(date: Date | null) {
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

export function buildStepReviews(
  formState: InvitationPageSeed | null
): Record<EditorStepKey, StepReview> {
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
  if ((formState.pageData?.galleryImages ?? []).some((imageUrl) => !isValidUrl(imageUrl))) {
    galleryWarnings.push('갤러리 이미지 주소 형식을 다시 확인해 주세요.');
  }
  if (formState.musicEnabled) {
    const selectedTrack = findInvitationMusicTrackById(formState.musicTrackId);
    if (!hasText(formState.musicStoragePath) && !hasText(formState.musicUrl)) {
      galleryWarnings.push('배경음악을 켠 경우 사용할 곡을 먼저 선택해 주세요.');
    }
    if (hasText(formState.musicTrackId) && !selectedTrack) {
      galleryWarnings.push('선택한 배경음악이 라이브러리에 없습니다. 곡을 다시 선택해 주세요.');
    }
  }
  if (
    typeof formState.musicVolume === 'number' &&
    (formState.musicVolume < 0 || formState.musicVolume > 1)
  ) {
    galleryWarnings.push('배경음악 볼륨은 0에서 1 사이 값으로 저장됩니다.');
  }

  const venueWarnings: string[] = [];
  if (!isValidPhone(formState.pageData?.ceremonyContact)) {
    venueWarnings.push('예식장 연락처 형식을 다시 확인해 주세요.');
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
    giftWarnings.push('계좌는 은행명, 계좌번호, 예금주를 모두 입력해 주세요.');
  }

  const finalWarnings: string[] = [];
  if (!isValidUrl(formState.metadata.images.favicon)) {
    finalWarnings.push('사이트 아이콘 주소는 http 또는 https 형식으로 입력해 주세요.');
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
        { label: '공유 제목', filled: hasText(formState.metadata.title) },
        { label: '공유 설명', filled: hasText(formState.metadata.description) },
        { label: '사이트 아이콘 주소', filled: hasText(formState.metadata.images.favicon) },
      ],
      finalWarnings,
      false
    ),
  };
}

export function findFirstInvalidRequiredStep(reviews: Record<EditorStepKey, StepReview>) {
  return (
    EDITOR_STEPS.find(
      (step) => !step.isOptional && reviews[step.key].completedRequiredCount < reviews[step.key].requiredCount
    )?.key ?? null
  );
}

export function getNextStepKey(currentStep: EditorStepKey | null) {
  if (!currentStep) {
    return EDITOR_STEPS[0]?.key ?? null;
  }

  const currentIndex = EDITOR_STEPS.findIndex((step) => step.key === currentStep);
  if (currentIndex < 0 || currentIndex >= EDITOR_STEPS.length - 1) {
    return null;
  }

  return EDITOR_STEPS[currentIndex + 1]?.key ?? null;
}

export function getPreviousStepKey(currentStep: EditorStepKey | null) {
  if (!currentStep) {
    return null;
  }

  const currentIndex = EDITOR_STEPS.findIndex((step) => step.key === currentStep);
  if (currentIndex <= 0) {
    return null;
  }

  return EDITOR_STEPS[currentIndex - 1]?.key ?? null;
}

export function getStepCriteriaText(step: StepDefinition, review: StepReview) {
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

export function getStepSummaryText(step: StepDefinition, review: StepReview) {
  if (step.isOptional) {
    return review.warnings.length > 0 ? '선택 항목 확인 필요' : '선택 항목';
  }

  return `필수 ${review.completedRequiredCount}/${review.requiredCount}`;
}
