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
    features: [
      '기본 노출 기간 3개월',
      '맞춤 문구 제작',
      '갤러리 최대 6장',
      'URL 링크 공유',
    ],
  },
  {
    name: 'DELUXE',
    tier: 'deluxe' as MobileInvitationProductTier,
    price: 25000,
    priceLabel: '25,000원',
    description:
      'STANDARD 전체 포함, 갤러리 이미지 최대 12장, 배경음악 포함, 카카오톡 카드 형식 공유',
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
    label: '감성 디자인',
    description: '사진과 분위기를 중심으로 보여주는 감성형 디자인입니다.',
  },
  {
    key: 'simple' as MobileInvitationThemeKey,
    label: '심플 디자인',
    description: '정보를 깔끔하게 정리해 보여주는 심플형 디자인입니다.',
  },
] as const;

export const guideSections = [
  {
    title: '시작 순서',
    items: [
      '서비스와 디자인을 선택합니다.',
      '고객 편집 비밀번호를 설정하고 생성 흐름을 진행합니다.',
      '예식 정보와 문구를 입력하면 페이지가 생성됩니다.',
      '생성 후에는 운영 탭에서 링크 공유, 공개 전환, 방명록 관리를 이어서 할 수 있습니다.',
    ],
  },
  {
    title: '이용 정책',
    items: [
      '기본 노출 기간은 3개월입니다.',
      '결과물은 앱이 아니라 웹 링크 형식으로 공유됩니다.',
      '한 계정에서 여러 청첩장을 운영하는 구조는 추후 확장 예정입니다.',
      '현재는 페이지 슬러그와 비밀번호 기반으로 고객 편집을 연동합니다.',
    ],
  },
  {
    title: '추가 티켓 정책',
    items: [
      '티켓은 1장당 4,000원입니다.',
      '티켓 3장은 10,000원입니다.',
      '티켓 1장: 1개월 연장',
      '티켓 1장: 디자인 변경',
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
      '현재 앱에서는 생성 흐름과 운영 흐름을 먼저 연결해 둔 상태이고, 실제 결제 연동은 다음 단계에서 붙일 예정입니다.',
  },
  {
    question: '청첩장 연동은 어떻게 하나요?',
    answer:
      '페이지 URL 또는 슬러그와 비밀번호로 연동합니다. 한 번 연동하면 앱에서 다시 이어서 운영할 수 있습니다.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '현재 기획 기준으로는 결제 후 3일 이내 정책을 검토 중이며, 실제 결제 연동 시점에 최종 정책을 확정할 예정입니다.',
  },
] as const;

export const guideSamplePages = [
  {
    title: '감성 디자인',
    items: [
      {
        label: 'STANDARD 샘플 보기',
        url: 'https://msgnote.kr/kim-taehyun-choi-yuna/emotional/',
      },
      {
        label: 'DELUXE 샘플 보기',
        url: 'https://msgnote.kr/lee-junho-park-somin/emotional/',
      },
      {
        label: 'PREMIUM 샘플 보기',
        url: 'https://msgnote.kr/kim-shinlang-na-sinbu/emotional/',
      },
    ],
  },
  {
    title: '심플 디자인',
    items: [
      {
        label: 'STANDARD 샘플 보기',
        url: 'https://msgnote.kr/kim-taehyun-choi-yuna/simple/',
      },
      {
        label: 'DELUXE 샘플 보기',
        url: 'https://msgnote.kr/lee-junho-park-somin/simple/',
      },
      {
        label: 'PREMIUM 샘플 보기',
        url: 'https://msgnote.kr/kim-shinlang-na-sinbu/simple/',
      },
    ],
  },
] as const;

export const sampleInvitations = [
  '감성 디자인 샘플 둘러보기',
  '심플 디자인 샘플 둘러보기',
  '서비스 등급별 구성 비교하기',
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
  '라이트·다크 모드와 글자 크기 설정은 즉시 반영됩니다.',
] as const;
