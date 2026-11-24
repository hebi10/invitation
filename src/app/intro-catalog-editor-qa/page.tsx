import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import IntroCatalogEditorQaClient from './IntroCatalogEditorQaClient';

export const metadata: Metadata = {
  title: '인트로 선택·저장 QA',
  robots: { index: false, follow: false },
};

export default function IntroCatalogEditorQaPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <IntroCatalogEditorQaClient />;
}
