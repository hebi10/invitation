import { MOBILE_BILLING_PREMIUM_PRICE_KRW } from '../lib/mobileBillingProducts';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../types/mobileInvitation';
import {
  getInvitationThemeLabel,
  getInvitationThemePreviewDescription,
  getInvitationThemePreviewSampleUrl,
  getSelectableInvitationThemeKeys,
} from '../lib/invitationThemes';

export const servicePlans = [
  {
    name: 'PREMIUM',
    tier: 'premium' as MobileInvitationProductTier,
    price: MOBILE_BILLING_PREMIUM_PRICE_KRW,
    priceLabel: '9,900원',
    description: '사진 최대 18장, 배경음악, 카카오톡 카드 공유, 캘린더·카운트다운과 방명록을 모두 제공합니다.',
    features: [
      '기본 노출 기간 4개월',
      '모든 웨딩 디자인 포함',
      '갤러리 최대 18장',
      '배경음악 지원',
      '카카오톡 카드 공유',
      '캘린더·카운트다운',
      '방명록 기능',
    ],
  },
] as const;

export const ticketPricing = {
  unitPrice: 1000,
} as const;

export const designThemes = getSelectableInvitationThemeKeys().map((key) => ({
  key,
  label: getInvitationThemeLabel(key),
  description: getInvitationThemePreviewDescription(key),
})) as ReadonlyArray<{
  key: MobileInvitationThemeKey;
  label: string;
  description: string;
}>;

export const guideSections = [
  {
    title: '시작 순서',
    items: [
      '계정이 없다면 회원가입 후 이메일 인증을 완료합니다.',
      '구매 탭에서 로그인하고 두 사람의 이름과 청첩장 주소를 입력합니다.',
      '프리미엄 구성과 9,900원 금액을 확인하고 앱에서 Google Play 결제를 진행합니다.',
      '생성 후 운영 탭에서 예식 정보와 사진을 입력하고 청첩장을 공유합니다.',
    ],
  },
  {
    title: '이용 정책',
    items: [
      '기본 노출 기간은 4개월입니다.',
      '결과물 파일이 아닌 링크 형식으로 공유합니다.',
      '다른 기기에서는 앱 연동 링크로 내 청첩장을 이어서 관리할 수 있습니다.',
    ],
  },
  {
    title: '추가 티켓 정책',
    items: [
      '티켓은 할인 없이 1장당 1,000원입니다.',
      '티켓은 청첩장 제작 결제에 포함되지 않습니다. 청첩장 연동 후 별도로 구매합니다.',
      '티켓 1장: 1개월 연장',
    ],
  },
] as const;

export const faqItems = [
  {
    question: '결제 후 바로 청첩장이 만들어지나요?',
    answer:
      '앱에서 Google Play 결제가 확인되면 청첩장이 생성됩니다. 이후 운영 탭에서 예식 정보와 사진을 입력해 주세요. 웹 미리보기에서는 결제와 실제 생성을 진행하지 않습니다.',
  },
  {
    question: '청첩장 연동은 어떻게 하나요?',
    answer:
      '로그인한 고객 계정에 연결된 청첩장을 불러오거나 앱 연동 링크로 다른 기기에서 이어서 운영합니다.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '구매 내역과 주문번호를 준비해 아래 고객 문의로 접수해 주세요. 결제 내역 확인에 필요한 정보만 보내 주세요.',
  },
] as const;

const GUIDE_SAMPLE_PRODUCT_TIERS: MobileInvitationProductTier[] = [
  'premium',
];

export const guideSamplePages = getSelectableInvitationThemeKeys().map((themeKey) => ({
  title: getInvitationThemeLabel(themeKey),
  themeKey,
  items: GUIDE_SAMPLE_PRODUCT_TIERS.flatMap((tier) => {
    const url = getInvitationThemePreviewSampleUrl(themeKey, tier);
    if (!url) {
      return [];
    }

    return [
      {
        label: `${tier.toUpperCase()} 샘플 보기`,
        tier,
        url,
      },
    ];
  }),
})) as ReadonlyArray<{
  title: string;
  themeKey: MobileInvitationThemeKey;
  items: Array<{
    label: string;
    tier: MobileInvitationProductTier;
    url: string;
  }>;
}>;

export function findGuideSamplePageUrl(
  themeKey: MobileInvitationThemeKey,
  tier: MobileInvitationProductTier
) {
  return getInvitationThemePreviewSampleUrl(themeKey, tier);
}

export const sampleInvitations = [
  '감성형 디자인 샘플 둘러보기',
  '심플형 디자인 샘플 둘러보기',
  '서비스 금액과 구성 비교하기',
] as const;

export const quickStartItems = [
  '새 청첩장 만들기',
  '기존 페이지 연동하기',
  '샘플 페이지 먼저 둘러보기',
] as const;

export const ticketActions = [
  { key: 'extend', label: '기간 1개월 연장', tickets: 1 },
] as const;

export const settingsNotes = [
  '청첩장 연동 정보는 이 기기에 저장됩니다.',
  '다른 기기에서 사용하려면 앱 연동 링크로 다시 연결해 주세요.',
  '테마와 글자 크기는 변경 즉시 적용됩니다.',
] as const;
