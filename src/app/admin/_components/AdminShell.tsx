import type { ReactNode } from 'react';

import type { AdminPrimaryView } from './adminPageUtils';
import styles from '../page.module.css';

interface AdminShellProps {
  activeView: AdminPrimaryView;
  adminEmail: string;
  onNavigate: (view: AdminPrimaryView) => void;
  onLogout: () => void;
  brandHref: string;
  children: ReactNode;
}

const PRIMARY_NAV_ITEMS: Array<{ key: AdminPrimaryView; label: string }> = [
  { key: 'events', label: '이벤트' },
  { key: 'comments', label: '방명록' },
  { key: 'customers', label: '고객' },
];

export default function AdminShell({
  activeView,
  adminEmail,
  onNavigate,
  onLogout,
  brandHref,
  children,
}: AdminShellProps) {
  return (
    <div className={styles.adminShell}>
      <header className={styles.adminTopbar}>
        <a href={brandHref} className={styles.adminBrand}>
          운영 관리
        </a>
        <nav aria-label="관리 업무" className={styles.adminPrimaryNav}>
          {PRIMARY_NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={activeView === item.key ? 'page' : undefined}
              className={styles.adminPrimaryNavItem}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.adminAccountMenu}>
          <span className={styles.adminAccountEmail}>{adminEmail}</span>
          <button
            type="button"
            className={styles.adminLogoutButton}
            onClick={onLogout}
          >
            로그아웃
          </button>
        </div>
      </header>
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}
