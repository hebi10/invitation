'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDialogLayer } from '@/hooks/useDialogLayer';
import styles from './AdminOverlayProvider.module.css';

type Work = { dirty: boolean; busy: boolean; save?: () => Promise<boolean> };
type Guard = { register: (work: Work | null) => void; request: (action: () => void) => void; isLeaving: () => boolean; dirty: boolean; busy: boolean };
const Context = createContext<Guard | null>(null);

export function useAdminWorkGuard(work: Work) {
  const context = useContext(Context);
  const register = context?.register;
  const saveRef = useRef(work.save);
  const isLeaving = context?.isLeaving;
  const canSave = !!work.save;
  saveRef.current = work.save;
  const save = useCallback(async () => (await saveRef.current?.()) ?? false, []);
  useEffect(() => {
    register?.({ dirty: work.dirty, busy: work.busy, save: canSave ? save : undefined });
    return () => register?.(null);
  }, [register, work.dirty, work.busy, canSave, save]);
  useEffect(() => {
    if (!work.dirty && !work.busy) return;
    const warn = (event: BeforeUnloadEvent) => { if (isLeaving?.()) return; event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [work.dirty, work.busy, isLeaving]);
}

export function useAdminWorkNavigation() {
  const context = useContext(Context);
  if (!context) throw new Error('AdminWorkGuardProvider is required');
  return context;
}

export function AdminWorkGuardProvider({ children, blocked = false }: { children: ReactNode; blocked?: boolean }) {
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const [work, setWork] = useState<Work | null>(null);
  const workRef = useRef<Work | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const isLeaving = useCallback(() => leaving.current, []);
  const proceed = useCallback((action: () => void) => {
    leaving.current = true;
    action();
    // A tab change remains in this workspace; a document navigation unloads first.
    window.setTimeout(() => { leaving.current = false; }, 1000);
  }, []);
  const register = useCallback((next: Work | null) => { workRef.current = next; setWork(next); }, []);
  const request = useCallback((action: () => void) => {
    if (blockedRef.current || workRef.current?.busy) return;
    if (workRef.current?.dirty) { setError(''); setPending(() => action); }
    else proceed(action);
  }, [proceed]);
  const close = () => { if (!saving) setPending(null); };
  useDialogLayer(ref, { open: !!pending, onClose: close, blocked: saving });
  const saveAndContinue = async () => {
    setSaving(true);
    setError('');
    try {
      if (await workRef.current?.save?.()) { setPending(null); if (pending) proceed(pending); }
      else setError('저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.');
    } catch { setError('저장하지 못했습니다. 입력은 그대로 유지됩니다.'); }
    finally { setSaving(false); }
  };
  return <Context.Provider value={{ register, request, isLeaving, dirty: !!work?.dirty, busy: blocked || !!work?.busy }}>
    {children}
    {pending ? <div className={styles.dialogBackdrop} onClick={close}>
      <div ref={ref} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="unsaved-work-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="unsaved-work-title" className={styles.dialogTitle}>변경 내용을 저장할까요?</h2>
        <p className={styles.dialogDescription}>저장하지 않고 이동하면 현재 탭의 변경 내용이 사라집니다.</p>
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.dialogActions}>
          <button data-dialog-initial-focus className={`${styles.dialogButton} ${styles.dialogCancel}`} disabled={saving} onClick={close}>계속 편집</button>
          <button className={`${styles.dialogButton} ${styles.dialogCancel}`} disabled={saving} onClick={() => { setPending(null); proceed(pending); }}>변경 버리기</button>
          {work?.save ? <button className={`${styles.dialogButton} ${styles.dialogConfirm}`} disabled={saving} onClick={() => void saveAndContinue()}>{saving ? '저장 중' : '저장 후 이동'}</button> : null}
        </div>
      </div>
    </div> : null}
  </Context.Provider>;
}
