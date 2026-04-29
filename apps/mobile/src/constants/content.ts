import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../types/mobileInvitation';
import {
  INVITATION_THEME_KEYS,
  getInvitationThemeLabel,
  getInvitationThemePreviewDescription,
  getInvitationThemePreviewSampleUrl,
  getSelectableInvitationThemeKeys,
} from '../lib/invitationThemes';

export const servicePlans = [
  {
    name: 'STANDARD',
    tier: 'standard' as MobileInvitationProductTier,
    price: 5000,
    priceLabel: '5,000원',
    description:
      '맞춤 문구 시작, 갤러리 최대 6장, 카카오톡 링크 형식 공유(URL 공유)를 제공합니다.',
    features: [
      '기본 노출 기간 6개월',
      '맞춤 문구 시작',
      '갤러리 최대 6장',
      'URL 링크 공유',
    ],
  },
  {
    name: 'DELUXE',
    tier: 'deluxe' as MobileInvitationProductTier,
    price: 10000,
    priceLabel: '10,000원',
    description:
      'STANDARD 전체 포함, 갤러리 최대 12장, 배경음악 포함, 카카오톡 카드 형식 공유를 제공합니다.',
    features: [
      'STANDARD 전체 포함',
      '갤러리 최대 12장',
      '배경음악 지원',
      '카카오톡 카드 공유',
    ],
  },
  {
    name: 'PREMIUM',
    tier: 'premium' as MobileInvitationProductTier,
    price: 15000,
    priceLabel: '15,000원',
    description:
      'DELUXE 전체 포함, 갤러리 최대 18장, 캘린더·카운트다운, 방명록 기능을 제공합니다.',
    features: [
      'DELUXE 전체 포함',
      '갤러리 최대 18장',
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
      '서비스와 디자인을 선택합니다.',
      '고객 인증 비밀번호를 설정하고 생성 흐름을 진행합니다.',
      '예식 정보와 문구를 입력하면 페이지가 생성됩니다.',
      '생성 후에는 운영 탭에서 링크 공유, 공개 전환, 방명록 관리를 이어서 할 수 있습니다.',
    ],
  },
  {
    title: '이용 정책',
    items: [
      '기본 노출 기간은 6개월입니다.',
      '결과물 파일이 아닌 링크 형식으로 공유합니다.',
      '페이지 연동은 비밀번호 기반 인증 흐름으로 진행합니다.',
    ],
  },
  {
    title: '추가 티켓 정책',
    items: [
      '티켓은 할인 없이 1장당 1,000원입니다.',
      '티켓 1장: 1개월 연장',
      '티켓 1장: 기본 디자인 변경',
      '티켓 1장: 모바일 청첩장 1개 추가 생성',
      '티켓 2장: 같은 청첩장에 다른 디자인 추가',
      '티켓 2장: 서비스 업그레이드',
    ],
  },
] as const;

export const faqItems = [
  {
    question: '결제 후 바로 청첩장이 만들어지나요?',
    answer:
      '현재 앱에서는 생성 흐름과 운영 흐름을 먼저 연결한 상태이고, 실제 결제 연동은 다음 단계에서 붙일 예정입니다.',
  },
  {
    question: '청첩장 연동은 어떻게 하나요?',
    answer:
      '페이지 URL 또는 관리자 비밀번호로 연동합니다. 한 번 연동하면 앱 안에서 다시 이어서 운영할 수 있습니다.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '현재 기획 기준으로는 결제 후 3일 이내 환불을 검토 중이며, 실제 결제 연동 시점에 최종 정책을 확정할 예정입니다.',
  },
] as const;

const GUIDE_SAMPLE_PRODUCT_TIERS: MobileInvitationProductTier[] = [
  'standard',
  'deluxe',
  'premium',
];

export const guideSamplePages = INVITATION_THEME_KEYS.map((themeKey) => ({
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
  { key: 'theme-change', label: '디자인 변경', tickets: 1 },
  { key: 'extra-page', label: '청첩장 1개 추가 생성', tickets: 1 },
  { key: 'extra-variant', label: '같은 청첩장에 다른 디자인 추가', tickets: 2 },
  { key: 'upgrade', label: '서비스 업그레이드', tickets: 2 },
] as const;

export const settingsNotes = [
  '현재 연동 세션은 기기 내부에만 저장됩니다.',
  'API 주소를 변경하면 기존 연동 세션은 초기화될 수 있습니다.',
  '라이트 모드와 글자 크기 설정은 즉시 반영됩니다.',
] as const;
