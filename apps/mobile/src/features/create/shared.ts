import {
  PAGE_SLUG_BASE_MAX_LENGTH,
  PAGE_SLUG_BASE_MIN_LENGTH,
  normalizePageSlugBase,
  type PageSlugAvailabilityReason,
  type PageSlugBaseValidationReason,
  validatePageSlugBase,
} from '../../lib/pageSlug';
import { createRandomSuffix } from '../../lib/id';
import {
  designThemes,
  servicePlans,
} from '../../constants/content';
import { isInvitationThemeKey } from '../../lib/invitationThemes';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

export const STICKY_CTA_BAR_HEIGHT = 48;
export const STICKY_CTA_BAR_COMPACT_HEIGHT = 88;
export const CREATE_PAGE_IDENTIFIER_MAX_LENGTH = PAGE_SLUG_BASE_MAX_LENGTH;

export const CREATE_STEPS = [
  { key: 'info', label: '기본 정보' },
  { key: 'selection', label: '디자인 확인' },
  { key: 'review', label: '결제 확인' },
] as const;

export type CreateValidationSection = 'basic' | 'selection';

export function getCreatePurchaseSummary(input: { servicePlan: MobileInvitationProductTier }) {
  const plan = servicePlans.find((item) => item.tier === input.servicePlan) ?? servicePlans[0];
  return { ticketCount: 0, estimatedPrice: plan.price };
}
export type CreateStepKey = (typeof CREATE_STEPS)[number]['key'];

export type CreateValidationRule = {
  section: CreateValidationSection;
  label: string;
  passed: boolean;
  errorMessage: string;
};

export function buildCreateValidationRules(input: {
  groomKoreanName: string;
  brideKoreanName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  pageIdentifier: string;
  selectedTheme: MobileInvitationThemeKey | null;
}): CreateValidationRule[] {
  const groomKoreanName = input.groomKoreanName.trim();
  const brideKoreanName = input.brideKoreanName.trim();
  const pageIdentifier = input.pageIdentifier.trim();
  const slugValidation = validatePageSlugBase(pageIdentifier);

  return [
    {
      label: '신랑 한글 이름',
      section: 'basic',
      passed: Boolean(groomKoreanName),
      errorMessage: '신랑 한글 이름을 입력해 주세요.',
    },
    {
      label: '신부 한글 이름',
      section: 'basic',
      passed: Boolean(brideKoreanName),
      errorMessage: '신부 한글 이름을 입력해 주세요.',
    },
    {
      label: '청첩장 주소',
      section: 'basic',
      passed: slugValidation.isValid,
      errorMessage: getCreateSlugValidationMessage(slugValidation.reason),
    },
  ];
}

function buildFallbackCreateSlugBase(seed: string) {
  const fallback = normalizePageSlugBase(`wedding-${seed}`);
  const validation = validatePageSlugBase(fallback);
  if (validation.isValid) {
    return validation.normalizedSlugBase;
  }

  return normalizePageSlugBase(`invite-${createRandomSuffix(6)}`);
}

function trimSuggestedSlugBase(value: string) {
  return value.slice(0, CREATE_PAGE_IDENTIFIER_MAX_LENGTH).replace(/-+$/g, '');
}

export function buildSuggestedCreateSlugBase(
  groomKoreanName: string,
  brideKoreanName: string,
  seed: string
) {
  const normalizedFromNames = trimSuggestedSlugBase(
    normalizePageSlugBase([groomKoreanName, brideKoreanName].filter(Boolean).join('-'))
  );
  const validation = validatePageSlugBase(normalizedFromNames);

  if (validation.isValid) {
    return validation.normalizedSlugBase;
  }

  return buildFallbackCreateSlugBase(seed);
}

export function getCreateSlugValidationMessage(reason: PageSlugBaseValidationReason | null) {
  switch (reason) {
    case 'required':
      return '청첩장 주소를 입력해 주세요.';
    case 'invalid':
      return '청첩장 주소는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.';
    case 'too_short':
      return `청첩장 주소는 ${PAGE_SLUG_BASE_MIN_LENGTH}자 이상으로 입력해 주세요.`;
    case 'too_long':
      return `청첩장 주소는 ${PAGE_SLUG_BASE_MAX_LENGTH}자 이하로 입력해 주세요.`;
    case 'reserved':
      return '이미 예약된 청첩장 주소입니다. 다른 주소를 입력해 주세요.';
    default:
      return '사용 가능한 청첩장 주소를 다시 확인해 주세요.';
  }
}

export function getCreateSlugAvailabilityMessage(
  reason: PageSlugAvailabilityReason | 'checking' | 'error',
  options: {
    isRecommended: boolean;
  }
) {
  switch (reason) {
    case 'checking':
      return '청첩장 주소 중복 여부를 확인하고 있습니다.';
    case 'ok':
      return options.isRecommended
        ? '자동으로 추천한 주소입니다. 필요하면 직접 수정할 수 있습니다.'
        : '현재 주소로 사용할 수 있습니다.';
    case 'taken':
      return '이미 사용 중인 주소입니다. 생성 시 뒤에 코드가 자동으로 붙을 수 있습니다.';
    case 'reserved':
      return '예약된 주소라 사용할 수 없습니다. 다른 주소를 입력해 주세요.';
    case 'too_short':
      return `청첩장 주소는 ${PAGE_SLUG_BASE_MIN_LENGTH}자 이상이어야 합니다.`;
    case 'too_long':
      return `청첩장 주소는 ${PAGE_SLUG_BASE_MAX_LENGTH}자 이하로 입력해 주세요.`;
    case 'invalid':
      return '영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.';
    case 'required':
      return '자동으로 추천한 주소를 그대로 사용하거나, 원하는 주소를 직접 입력할 수 있습니다.';
    case 'error':
      return '중복 확인에 실패해도 생성 시 서버에서 최종 주소를 확정합니다.';
    default:
      return '자동으로 추천한 주소를 그대로 사용하거나, 원하는 주소를 직접 입력할 수 있습니다.';
  }
}

export function isValidCreateStepProductTier(
  value: string | undefined
): value is MobileInvitationProductTier {
  return value === 'premium';
}

export function isValidCreateStepThemeKey(
  value: string | undefined
): value is MobileInvitationThemeKey {
  return isInvitationThemeKey(value);
}

export { designThemes, servicePlans };
