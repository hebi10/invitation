import '@/app/admin/admin-theme.css';

import { AdminOverlayProvider } from '@/app/admin/_components';

export default function ExperienceAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-admin-ui>
      <AdminOverlayProvider>{children}</AdminOverlayProvider>
    </div>
  );
}
