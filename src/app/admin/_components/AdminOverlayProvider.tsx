'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
    setToasts((prev) => {
      const next = [...prev, { id, ...toast }];
      return next.length > 5 ? next.slice(-5) : next;
    });

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2600);
  };

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setPendingConfirm({ ...options, resolve });
    });

  useEffect(() => {
    return () => {
      if (pendingConfirm) {
        pendingConfirm.resolve(false);
      }
    };
  }, [pendingConfirm]);

  const closeConfirm = useCallback((result: boolean) => {
    if (!pendingConfirm) {
      return;
    }

    pendingConfirm.resolve(result);
    setPendingConfirm(null);
  }, [pendingConfirm]);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pendingConfirm) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeConfirm(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const dialog = dialogRef.current;
    if (dialog) {
      const confirmButton = dialog.querySelector<HTMLButtonElement>('[data-confirm-action]');
      confirmButton?.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pendingConfirm, closeConfirm]);

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
          <div className={styles.dialogBackdrop} role="presentation" onClick={() => closeConfirm(false)}>
            <div
              ref={dialogRef}
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-confirm-title"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Tab') {
                  const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                  );
                  if (!focusable || focusable.length === 0) {
                    return;
                  }

                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];

                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                  }
                }
              }}
            >
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
                  data-confirm-action
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
