import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FirebaseTestClient from './FirebaseTestClient';

const devToolsEnabled =
  process.env.NODE_ENV !== 'production' &&
  (process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true' || process.env.ENABLE_DEV_TOOLS === 'true');

export const metadata: Metadata = {
  title: 'Firebase Test',
  description: 'Development-only Firebase diagnostics page.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FirebaseTestPage() {
  if (!devToolsEnabled) {
    notFound();
  }

  return <FirebaseTestClient />;
}
