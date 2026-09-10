import type { Metadata } from 'next';
import WizardPreviewClient from './WizardPreviewClient';

export const metadata: Metadata = {
  title: '청첩장 입력 미리보기',
  robots: { index: false, follow: false },
};

export default function WizardPreviewPage() {
  return <WizardPreviewClient />;
}
