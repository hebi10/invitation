export type EditorStepKey =
  | 'basic'
  | 'schedule'
  | 'venue'
  | 'greeting'
  | 'gallery'
  | 'gift'
  | 'final';

export type StepDefinition = {
  key: EditorStepKey;
  step: string;
  title: string;
  description: string;
  previewSection:
    | 'cover'
    | 'wedding'
    | 'greeting'
    | 'gallery'
    | 'gift'
    | 'metadata';
  isOptional: boolean;
};

export const EDITOR_STEPS: StepDefinition[] = [
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
    title: '공유 정보와 최종 확인',
    description: '손님에게 보일 공유 제목과 설명을 정리하고 마지막 저장 상태를 확인합니다.',
    previewSection: 'metadata',
    isOptional: false,
  },
];

export const STEP_MAP = Object.fromEntries(
  EDITOR_STEPS.map((step) => [step.key, step])
) as Record<EditorStepKey, StepDefinition>;

export const GREETING_TEMPLATES = [
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

export const TRANSPORT_GUIDE_TEMPLATES = [
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

export const GALLERY_GUIDE_ITEMS = [
  '세로 1080px 이상 이미지를 권장합니다.',
  'JPG 또는 PNG 이미지를 사용해 주세요.',
  '인물의 얼굴과 손이 중앙에 오도록 여백을 확인해 주세요.',
];

export function buildEditorTitle(
  groomName: string,
  brideName: string,
  fallbackLabel: string
) {
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

export function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

export function parseNumericInput(value: string, fallback = 0) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isValidUrl(value?: string | null) {
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

export function isValidPhone(value?: string | null) {
  if (!hasText(value)) {
    return true;
  }

  const digits = value!.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}
