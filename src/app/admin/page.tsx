import { Suspense } from 'react';
import AdminPageClient from './AdminPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function AdminPageFallback() {
  return <div style={{ minHeight: '100vh', background: '#f4f6fb' }} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <AdminPageClient />
    </Suspense>
  );
}
