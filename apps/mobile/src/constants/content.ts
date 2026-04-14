import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../types/mobileInvitation';

export const servicePlans = [
  {
    name: 'STANDARD',
    tier: 'standard' as MobileInvitationProductTier,
    price: 20000,
    priceLabel: '20,000원',
    description:
      '맞춤 문구 제작, 갤러리 이미지 최대 6장, 카카오톡 링크 형식 공유(URL 공유)',
    features: ['기본 3개월 노출', '맞춤 문구 제작', '갤러리 최대 6장', 'URL 링크 공유'],
  },
  {
    name: 'DELUXE',
    tier: 'deluxe' as MobileInvitationProductTier,
    price: 25000,
    priceLabel: '25,000원',
    description:
      'STANDARD 전체 포함, 갤러리 이미지 최대 12장, 음악 포함, 카카오톡 카드 형식 공유',
    features: [
      'STANDARD 전체 포함',
      '갤러리 최대 12장',
      '배경음악 사용 가능',
      '카카오톡 카드 공유',
    ],
  },
  {
    name: 'PREMIUM',
    tier: 'premium' as MobileInvitationProductTier,
    price: 30000,
    priceLabel: '30,000원',
    description:
      'DELUXE 전체 포함, 갤러리 이미지 최대 18장, 캘린더 카운트다운, 방명록 기능',
    features: [
      'DELUXE 전체 포함',
      '갤러리 최대 18장',
      '캘린더 카운트다운',
      '방명록 기능',
    ],
  },
] as const;

export const designThemes = [
  {
    key: 'emotional' as MobileInvitationThemeKey,
    label: '감성형',
    description: '사진과 분위기를 중심으로 보여주는 감성형 레이아웃',
  },
  {
    key: 'simple' as MobileInvitationThemeKey,
    label: '심플형',
    description: '정보를 정돈해서 보여주는 심플형 레이아웃',
  },
] as const;

export const guideSections = [
  {
    title: '제작 순서',
    items: [
      '서비스와 디자인을 선택합니다.',
      '고객 편집 비밀번호를 설정하고 결제를 진행합니다.',
      '결제 후 예식 정보와 문구를 입력합니다.',
      '웹 링크형 청첩장이 생성되고 운영 탭에서 관리합니다.',
    ],
  },
  {
    title: '이용 정책',
    items: [
      '기본 노출 기간은 3개월입니다.',
      '결과물은 앱 내부 전용이 아니라 웹 링크 형태로 공유합니다.',
      '계정당 청첩장은 최대 3개까지 관리할 수 있습니다.',
      '비밀번호 분실 및 변경은 관리자 문의 흐름을 기준으로 운영합니다.',
    ],
  },
  {
    title: '티켓 정책',
    items: [
      '10,000원 결제 시 티켓 3장이 지급됩니다.',
      '티켓 1장으로 디자인 변경, 1개월 연장, 청첩장 1개 추가 생성이 가능합니다.',
      '티켓 2장으로 같은 청첩장에 다른 디자인 추가 또는 상위 서비스 업그레이드가 가능합니다.',
    ],
  },
] as const;

export const faqItems = [
  {
    question: '결제 후 바로 청첩장이 만들어지나요?',
    answer:
      '모바일 앱에서는 결제 후 상세 정보를 입력하면 웹 링크형 청첩장 생성 흐름으로 이어지도록 설계하고 있습니다.',
  },
  {
    question: '로그인은 어떻게 하나요?',
    answer:
      '페이지 URL 또는 슬러그와 페이지 비밀번호로 로그인합니다. 한 번 로그인하면 앱을 다시 열어도 자동 로그인 상태를 복원합니다.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '현재 기획안 기준으로 결제 후 3일 이내 무료 환불을 고려하고 있으며, 환불 완료 후 동일 주문으로 재제작은 제한합니다.',
  },
] as const;

export const sampleInvitations = [
  '감성형 웨딩 샘플',
  '심플형 웨딩 샘플',
  '프리미엄 카운트다운 샘플',
] as const;

export const quickStartItems = [
  '새 청첩장 제작 초안 작성',
  '서비스 등급 비교 보기',
  '이미 만든 페이지 운영하기',
] as const;

export const ticketActions = [
  { key: 'extend', label: '기간 1개월 연장', tickets: 1 },
  { key: 'theme-change', label: '디자인 변경', tickets: 1 },
  { key: 'extra-page', label: '청첩장 1개 추가 생성', tickets: 1 },
  { key: 'extra-variant', label: '같은 청첩장 다른 디자인 추가', tickets: 2 },
  { key: 'upgrade', label: '상위 서비스 업그레이드', tickets: 2 },
] as const;

export const settingsNotes = [
  '자동 로그인 세션은 기기에 저장됩니다.',
  'API 주소를 변경하면 현재 로그인 세션은 초기화됩니다.',
  '라이트/다크 모드와 글자 크기 설정은 즉시 반영됩니다.',
] as const;
