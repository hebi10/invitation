import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import IntroCatalogPreviewClient from './IntroCatalogPreviewClient';

export const metadata: Metadata = {
  title: '인트로 카탈로그 QA',
  robots: { index: false, follow: false },
};

export default function IntroCatalogPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <IntroCatalogPreviewClient />;
}
