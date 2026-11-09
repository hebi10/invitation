export type WeddingIntroStyle = 'none' | 'light' | 'cinema' | 'envelope';

export const WEDDING_INTRO_OPTIONS: { value: WeddingIntroStyle; label: string; description: string }[] = [
  { value: 'none', label: '사용 안 함', description: '청첩장 표지를 바로 보여줍니다.' },
  { value: 'light', label: '타이포그래피형', description: '차분한 종이 배경에 두 사람의 이름이 부드럽게 나타납니다.' },
  { value: 'cinema', label: '웨딩 화보형', description: '대표 사진과 이름이 짧고 자연스럽게 나타납니다.' },
  { value: 'envelope', label: '편지형 초대장', description: '종이 카드를 눌러 청첩장 본문을 엽니다.' },
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
