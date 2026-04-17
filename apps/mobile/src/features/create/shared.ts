import {
  designThemes,
  servicePlans,
  ticketPricing,
} from '../../constants/content';
import {
  buildPageSlugBaseFromEnglishNames,
  isValidEnglishName,
} from '../../lib/pageSlug';
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
export const TICKET_PRESET_COUNTS = [0, 1, 3, 6] as const;
export const MAX_TICKET_COUNT = 12;
export const STICKY_CTA_BAR_HEIGHT = 92;
export const STICKY_CTA_BAR_COMPACT_HEIGHT = 156;

export const CREATE_STEPS = [
  { key: 'info', label: '기본 정보' },
  { key: 'selection', label: '선택' },
  { key: 'ticket', label: '티켓' },
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

export function calculateTicketPrice(ticketCount: number) {
  const bundleCount = Math.floor(ticketCount / TICKET_DISCOUNT_BUNDLE_SIZE);
  const remainderCount = ticketCount % TICKET_DISCOUNT_BUNDLE_SIZE;

  return bundleCount * TICKET_BUNDLE_PRICE + remainderCount * TICKET_UNIT_PRICE;
}

export function buildCreateValidationRules(input: {
  groomKoreanName: string;
  brideKoreanName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  password: string;
  confirmPassword: string;
  selectedTheme: MobileInvitationThemeKey | null;
}): CreateValidationRule[] {
  const groomKoreanName = input.groomKoreanName.trim();
  const brideKoreanName = input.brideKoreanName.trim();
  const groomEnglishName = input.groomEnglishName.trim();
  const brideEnglishName = input.brideEnglishName.trim();
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
      label: '신랑 영문 이름',
      section: 'basic',
      passed: Boolean(groomEnglishName) && isValidEnglishName(groomEnglishName),
      errorMessage: !groomEnglishName
        ? '신랑 영문 이름을 입력해 주세요.'
        : '신랑 영문 이름은 영문, 공백, 하이픈만 사용할 수 있습니다.',
    },
    {
      label: '신부 영문 이름',
      section: 'basic',
      passed: Boolean(brideEnglishName) && isValidEnglishName(brideEnglishName),
      errorMessage: !brideEnglishName
        ? '신부 영문 이름을 입력해 주세요.'
        : '신부 영문 이름은 영문, 공백, 하이픈만 사용할 수 있습니다.',
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

export function buildCreateSlugBase(groomEnglishName: string, brideEnglishName: string) {
  return buildPageSlugBaseFromEnglishNames(groomEnglishName, brideEnglishName);
}

export function isValidCreateStepProductTier(
  value: string | undefined
): value is MobileInvitationProductTier {
  return value === 'standard' || value === 'deluxe' || value === 'premium';
}

export function isValidCreateStepThemeKey(
  value: string | undefined
): value is MobileInvitationThemeKey {
  return value === 'emotional' || value === 'simple';
}

export { designThemes, servicePlans };
