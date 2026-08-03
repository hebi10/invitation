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
  const toastTimersRef = useRef(new Map<number, number>());
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pendingConfirmRef = useRef<PendingConfirm | null>(null);
  const focusRestoreFrameRef = useRef<number | null>(null);

  const cancelScheduledFocusRestore = useCallback(() => {
    const frame = focusRestoreFrameRef.current;
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
      focusRestoreFrameRef.current = null;
    }
  }, []);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }

    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = nextToastId.current++;
    setToasts((prev) => {
      const next = [...prev, { id, ...toast }];
      if (next.length <= 5) {
        return next;
      }

      const removedToast = next[0];
      const removedTimer = toastTimersRef.current.get(removedToast.id);
      if (removedTimer !== undefined) {
        window.clearTimeout(removedTimer);
        toastTimersRef.current.delete(removedToast.id);
      }
      return next.slice(-5);
    });

    const timer = window.setTimeout(() => dismissToast(id), 5000);
    toastTimersRef.current.set(id, timer);
  }, [dismissToast]);

  const confirm = useCallback((options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      const activeConfirm = pendingConfirmRef.current;
      const hasPendingFocusRestore = focusRestoreFrameRef.current !== null;
      if (hasPendingFocusRestore) {
        cancelScheduledFocusRestore();
      }

      if (activeConfirm) {
        activeConfirm.resolve(false);
      } else if (!hasPendingFocusRestore) {
        previousFocusRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }

      const nextConfirm = { ...options, resolve };
      pendingConfirmRef.current = nextConfirm;
      setPendingConfirm(nextConfirm);
    }), [cancelScheduledFocusRestore]);

  useEffect(() => {
    const toastTimers = toastTimersRef.current;

    return () => {
      toastTimers.forEach((timer) => window.clearTimeout(timer));
      toastTimers.clear();
      const activeConfirm = pendingConfirmRef.current;
      pendingConfirmRef.current = null;
      activeConfirm?.resolve(false);
      cancelScheduledFocusRestore();
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [cancelScheduledFocusRestore]);

  const restorePreviousFocus = useCallback(() => {
    cancelScheduledFocusRestore();
    focusRestoreFrameRef.current = window.requestAnimationFrame(() => {
      focusRestoreFrameRef.current = null;
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    });
  }, [cancelScheduledFocusRestore]);

  const closeConfirm = useCallback((result: boolean) => {
    const activeConfirm = pendingConfirmRef.current;
    if (!activeConfirm) {
      return;
    }

    activeConfirm.resolve(result);
    pendingConfirmRef.current = null;
    setPendingConfirm(null);
    restorePreviousFocus();
  }, [restorePreviousFocus]);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pendingConfirm) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeConfirm(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableDialogElements(dialogRef.current);
      if (focusable.length === 0) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const activeIndex = activeElement ? focusable.indexOf(activeElement) : -1;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusable.length - 1)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const dialog = dialogRef.current;
    if (dialog) {
      const initialFocusSelector =
        pendingConfirm.tone === 'danger' ? '[data-cancel-action]' : '[data-confirm-action]';
      getFocusableDialogElements(dialog)
        .find((element) => element.matches(initialFocusSelector))
        ?.focus();
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
                <div className={styles.toastHeader}>
                  <strong className={styles.toastTitle}>{toast.title}</strong>
                  <button
                    type="button"
                    className={styles.toastDismiss}
                    aria-label="토스트 닫기"
                    onClick={() => dismissToast(toast.id)}
                  >
                    ×
                  </button>
                </div>
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
                  data-cancel-action
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

function getFocusableDialogElements(dialog: HTMLDivElement | null) {
  if (!dialog) {
    return [];
  }

  return [...dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => {
    const style = window.getComputedStyle(element);
    return (
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.closest('[aria-hidden="true"]') &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getClientRects().length > 0
    );
  });
}
