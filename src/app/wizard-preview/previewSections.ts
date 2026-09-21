import type { WizardStepKey } from '../page-wizard/pageWizardData';

export type PreviewStep = WizardStepKey | 'family' | 'guide';

export const previewSections: Record<PreviewStep, { label: string; selector: string }> = {
  eventType: { label: '표지', selector: 'main > :first-child' },
  theme: { label: '표지', selector: 'main > :first-child' },
  slug: { label: '표지', selector: 'main > :first-child' },
  basic: { label: '기본·가족 정보', selector: 'main > :first-child' },
  family: { label: '가족 연락처', selector: '[data-wedding-section="contact"]' },
  guide: { label: '교통·방문 안내', selector: '[data-wedding-section="transport"]' },
  schedule: { label: '예식 안내', selector: '[data-wedding-section="ceremony"]' },
  venue: { label: '오시는 길', selector: '[data-wedding-section="schedule"]' },
  greeting: { label: '초대의 글', selector: '[data-wedding-section="invitation"]' },
  images: { label: '사진', selector: '[data-wedding-section="gallery"]' },
  extra: { label: '마음 전하실 곳', selector: '[data-wedding-section="gift"]' },
  music: { label: '인트로·음악', selector: 'main > :first-child' },
  final: { label: '전체 청첩장', selector: 'main > :first-child' },
};

export function isPreviewStep(value: unknown): value is PreviewStep {
  return typeof value === 'string' && Object.hasOwn(previewSections, value);
}
