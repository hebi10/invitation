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
  ticketPricing,
} from '../../constants/content';
import { isInvitationThemeKey } from '../../lib/invitationThemes';
import {
  MOBILE_BILLING_TICKET_PACK_COUNTS,
  isMobileBillingTicketPackCount,
  type MobileBillingTicketPackCount,
} from '../../lib/mobileBillingProducts';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

export const TICKET_USAGE_ITEMS = [
  '티켓 1장: 1개월 연장',
  '티켓 1장: 디자인 변경',
  '티켓 2장: 같은 청첩장에 다른 디자인 추가',
  '티켓 2장: 서비스 업그레이드',
] as const;

export const TICKET_UNIT_PRICE = ticketPricing.unitPrice;
export const TICKET_DISCOUNT_BUNDLE_SIZE = ticketPricing.bundleSize;
export const TICKET_BUNDLE_PRICE = ticketPricing.bundlePrice;
export const TICKET_PRESET_COUNTS = [0, ...MOBILE_BILLING_TICKET_PACK_COUNTS] as const;
export const MAX_TICKET_COUNT = MOBILE_BILLING_TICKET_PACK_COUNTS.at(-1) ?? 0;
export const STICKY_CTA_BAR_HEIGHT = 30;
export const STICKY_CTA_BAR_COMPACT_HEIGHT = 30;
export const CREATE_PAGE_IDENTIFIER_MAX_LENGTH = PAGE_SLUG_BASE_MAX_LENGTH;

export const CREATE_STEPS = [
  { key: 'info', label: '기본 정보' },
  { key: 'selection', label: '선택' },
  { key: 'ticket', label: '추가 티켓' },
  { key: 'review', label: '결제' },
] as const;

export type CreateValidationSection = 'basic' | 'security' | 'selection';
export type CreateStepKey = (typeof CREATE_STEPS)[number]['key'];

export type CreateValidationRule = {
  section: CreateValidationSection;
  label: string;
  passed: boolean;
  errorMessage: string;
};

export type TicketPurchaseSuccessState = {
  ticketCount: number;
  targetDisplayName: string;
  nextTicketCount: number;
};

export type SupportedCreateTicketCount = typeof TICKET_PRESET_COUNTS[number];

export function calculateTicketPrice(ticketCount: number) {
  const bundleCount = Math.floor(ticketCount / TICKET_DISCOUNT_BUNDLE_SIZE);
  const remainderCount = ticketCount % TICKET_DISCOUNT_BUNDLE_SIZE;

  return bundleCount * TICKET_BUNDLE_PRICE + remainderCount * TICKET_UNIT_PRICE;
}

export function isSupportedCreateTicketCount(
  value: number
): value is SupportedCreateTicketCount {
  return TICKET_PRESET_COUNTS.includes(value as SupportedCreateTicketCount);
}

export function normalizeSupportedCreateTicketCount(value: number) {
  return isSupportedCreateTicketCount(value) ? value : 0;
}

export function getAdjacentSupportedTicketCount(
  currentCount: number,
  direction: 'decrease' | 'increase'
) {
  const currentIndex = TICKET_PRESET_COUNTS.indexOf(
    normalizeSupportedCreateTicketCount(currentCount)
  );
  const nextIndex =
    direction === 'increase'
      ? Math.min(TICKET_PRESET_COUNTS.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);

  return TICKET_PRESET_COUNTS[nextIndex] ?? 0;
}

export function isPurchasableTicketPackCount(
  value: number
): value is MobileBillingTicketPackCount {
  return isMobileBillingTicketPackCount(value);
}

export function buildCreateValidationRules(input: {
  groomKoreanName: string;
  brideKoreanName: string;
  pageIdentifier: string;
  password: string;
  confirmPassword: string;
  selectedTheme: MobileInvitationThemeKey | null;
}): CreateValidationRule[] {
  const groomKoreanName = input.groomKoreanName.trim();
  const brideKoreanName = input.brideKoreanName.trim();
  const pageIdentifier = input.pageIdentifier.trim();
  const slugValidation = validatePageSlugBase(pageIdentifier);
  const password = input.password.trim();
  const confirmPassword = input.confirmPassword.trim();

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
    {
      label: '페이지 비밀번호',
      section: 'security',
      passed: password.length >= 4,
      errorMessage: !password
        ? '페이지 비밀번호를 입력해 주세요.'
        : '페이지 비밀번호는 4자 이상으로 입력해 주세요.',
    },
    {
      label: '비밀번호 확인',
      section: 'security',
      passed: Boolean(confirmPassword) && password === confirmPassword,
      errorMessage: !confirmPassword
        ? '비밀번호 확인을 입력해 주세요.'
        : '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
    },
    {
      label: '디자인 선택',
      section: 'selection',
      passed: Boolean(input.selectedTheme),
      errorMessage: '디자인을 먼저 선택해 주세요.',
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
  return value === 'standard' || value === 'deluxe' || value === 'premium';
}

export function isValidCreateStepThemeKey(
  value: string | undefined
): value is MobileInvitationThemeKey {
  return isInvitationThemeKey(value);
}

export { designThemes, servicePlans };
