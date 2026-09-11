export type WeddingIntroStyle = 'none' | 'light' | 'cinema' | 'envelope';

export const WEDDING_INTRO_OPTIONS: { value: WeddingIntroStyle; label: string; description: string }[] = [
  { value: 'none', label: '사용 안 함', description: '청첩장 표지를 바로 보여줍니다.' },
  { value: 'light', label: '빛으로 시작', description: '은은한 빛과 반짝임 속에서 두 사람의 이름이 나타납니다.' },
  { value: 'cinema', label: '영화처럼 시작', description: '대표 사진과 이름이 영화의 첫 장면처럼 펼쳐집니다.' },
  { value: 'envelope', label: '봉투 열기', description: '금빛 봉인을 누르면 초대장이 펼쳐집니다.' },
];

export function normalizeWeddingIntroStyle(value: unknown): WeddingIntroStyle {
  return value === 'light' || value === 'cinema' || value === 'envelope' ? value : 'none';
}

export function weddingIntroSessionKey(slug: string) {
  return `wedding-intro:v1:${slug}`;
}

export function shouldShowWeddingIntro({ style, preview, hash, seen }: {
  style: WeddingIntroStyle; preview: boolean; hash: string; seen: boolean;
}) {
  return style !== 'none' && (preview || (!hash && !seen));
}
