'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import styles from './AdminOverlayProvider.module.css';

type ToastTone = 'success' | 'error' | 'info';
type ConfirmTone = 'primary' | 'danger';

type ToastItem = {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type AdminOverlayContextValue = {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const AdminOverlayContext = createContext<AdminOverlayContextValue | undefined>(undefined);

export function AdminOverlayProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const nextToastId = useRef(1);

  const showToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, ...toast }]);
  };

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setPendingConfirm({ ...options, resolve });
    });

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    return () => {
      if (pendingConfirm) {
        pendingConfirm.resolve(false);
      }
    };
  }, [pendingConfirm]);

  const closeConfirm = (result: boolean) => {
    if (!pendingConfirm) {
      return;
    }

    pendingConfirm.resolve(result);
    setPendingConfirm(null);
  };

  return (
    <AdminOverlayContext.Provider value={{ showToast, confirm }}>
      <div className={styles.overlayRoot}>
        {children}

        {toasts.length > 0 && (
          <div className={styles.toastViewport} aria-live="polite" aria-atomic="true">
            {toasts.map((toast) => (
              <div key={toast.id} className={`${styles.toast} ${styles[`tone${capitalize(toast.tone)}`]}`}>
                <strong className={styles.toastTitle}>{toast.title}</strong>
                {toast.message ? <p className={styles.toastMessage}>{toast.message}</p> : null}
              </div>
            ))}
          </div>
        )}

        {pendingConfirm ? (
          <div className={styles.dialogBackdrop} role="presentation">
            <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
              <h2 id="admin-confirm-title" className={styles.dialogTitle}>
                {pendingConfirm.title}
              </h2>
              {pendingConfirm.description ? (
                <p className={styles.dialogDescription}>{pendingConfirm.description}</p>
              ) : null}

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={`${styles.dialogButton} ${styles.dialogCancel}`}
                  onClick={() => closeConfirm(false)}
                >
                  {pendingConfirm.cancelLabel ?? '취소'}
                </button>
                <button
                  type="button"
                  className={`${styles.dialogButton} ${styles.dialogConfirm} ${
                    pendingConfirm.tone === 'danger' ? styles.dialogConfirmDanger : ''
                  }`}
                  onClick={() => closeConfirm(true)}
                >
                  {pendingConfirm.confirmLabel ?? '확인'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminOverlayContext.Provider>
  );
}

export function useAdminOverlay() {
  const context = useContext(AdminOverlayContext);

  if (!context) {
    throw new Error('useAdminOverlay must be used within AdminOverlayProvider');
  }

  return context;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
