import type { Metadata } from 'next';
import SampleInvitation from './SampleInvitation';

export const metadata: Metadata = {
  title: '기본형 청첩장 샘플',
  description: '사진과 예시 방명록이 담긴 기본형 청첩장을 둘러보세요.',
  robots: { index: false, follow: false },
};

export default function SampleInvitationPage() { return <SampleInvitation />; }
