import type { ReactNode } from 'react';

import type { AdminPrimaryView } from './adminPageUtils';
import styles from '../page.module.css';
import { useAdminWorkNavigation } from './AdminWorkGuard';

type AdminShellView = AdminPrimaryView | 'home';

interface AdminShellProps {
  activeView: AdminShellView;
  adminEmail: string;
  onNavigate: (view: AdminShellView) => void;
  onLogout: () => void;
  brandHref: string;
  customerPageHref: string;
  children: ReactNode;
}

const PRIMARY_NAV_ITEMS: Array<{ key: AdminShellView; label: string }> = [
  { key: 'home', label: '운영 홈' },
  { key: 'events', label: '이벤트' },
  { key: 'customers', label: '고객' },
  { key: 'comments', label: '방명록' },
];

export default function AdminShell({
  activeView,
  adminEmail,
  onNavigate,
  onLogout,
  brandHref,
  customerPageHref,
  children,
}: AdminShellProps) {
  const { request } = useAdminWorkNavigation();
  return (
    <div className={styles.adminShell}>
      <header className={styles.adminTopbar}>
        <a href={brandHref} className={styles.adminBrand} onClick={(event) => {
          event.preventDefault();
          request(() => onNavigate('home'));
        }}>
          운영 관리
        </a>
        <nav aria-label="관리 업무" className={styles.adminPrimaryNav}>
          {PRIMARY_NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={activeView === item.key ? 'page' : undefined}
              className={styles.adminPrimaryNavItem}
              onClick={() => request(() => onNavigate(item.key))}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.adminAccountMenu}>
          <span className={styles.adminAccountEmail}>{adminEmail}</span>
          <a
            className={styles.adminCustomerPageLink}
            href={customerPageHref}
            target="_blank"
            rel="noreferrer"
          >
            고객 페이지
          </a>
          <button
            type="button"
            className={styles.adminLogoutButton}
            onClick={() => request(onLogout)}
          >
            로그아웃
          </button>
        </div>
      </header>
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}
