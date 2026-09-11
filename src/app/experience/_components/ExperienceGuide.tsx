'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useExperience } from '@/contexts';
import { useDialogLayer } from '@/hooks/useDialogLayer';

import { resolveExperienceGuideStep, type ExperienceGuideStep } from './experienceGuideModel';
import styles from './ExperienceGuide.module.css';

function StepGuide({ step, storageKey }: { step: ExperienceGuideStep; storageKey: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const dismissedRef = useRef(false);
  const close = useCallback(() => {
    dismissedRef.current = true;
    try { window.sessionStorage.setItem(storageKey, 'seen'); } catch { /* 안내 저장이 차단되어도 편집은 계속할 수 있습니다. */ }
    setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    try { if (window.sessionStorage.getItem(storageKey) === 'seen') return; } catch { /* 메모리 상태로 안내를 유지합니다. */ }
    let shown = false;
    const showWhenReady = () => {
      if (shown || dismissedRef.current || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      shown = true;
      setOpen(true);
    };
    const observer = new MutationObserver(showWhenReady);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(showWhenReady);
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, [storageKey]);

  useDialogLayer(dialogRef, { open, onClose: close });

  return (
    <>
      <aside className={styles.bar} aria-label="현재 화면 체험 안내">
        <p>{step.stage} · 실제 화면에서 직접 진행해 주세요.</p>
        <button type="button" onClick={() => setOpen(true)}>안내 다시 보기</button>
      </aside>
      {open ? createPortal(
        <div className={styles.overlay}>
          <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="experience-guide-title" aria-describedby="experience-guide-description">
            <div className={styles.header}>
              <p className={styles.stage}>{step.stage}</p>
              <button type="button" className={styles.close} onClick={close} aria-label="체험 안내 닫기"><img src="/images/admin/close.webp" alt="" width={18} height={18} /></button>
            </div>
            <h2 id="experience-guide-title">{step.title}</h2>
            <p id="experience-guide-description" className={styles.description}>{step.description}</p>
            <ol className={styles.tasks}>{step.tasks.map((task) => <li key={task}>{task}</li>)}</ol>
            {step.id === 'customer' ? <p className={styles.notice}>체험 데이터는 매일 한국 시간 00시에 초기화됩니다. 이름·연락처는 샘플로 유지해 주세요. 안내는 언제든 다시 볼 수 있습니다.</p> : null}
            <button type="button" className={styles.confirm} onClick={close} data-dialog-initial-focus>{step.action}</button>
          </section>
        </div>, document.body,
      ) : null}
    </>
  );
}

/** 화면과 실제 편집 단계만 관찰합니다. 저장·이동·완료 처리를 대신 실행하지 않습니다. */
export default function ExperienceGuide() {
  const pathname = usePathname();
  const { session } = useExperience();
  const [screen, setScreen] = useState<{ pathname: string; step: ExperienceGuideStep | null }>({ pathname: '', step: null });

  useEffect(() => {
    const update = () => {
      const step = resolveExperienceGuideStep(pathname, {
        wizardStep: document.querySelector('[data-experience-step]')?.getAttribute('data-experience-step'),
        customerReady: !!document.querySelector('[data-experience-customer-ready="true"]'),
        resultReady: !!document.querySelector('[data-experience-result-ready="true"]'),
        previewReady: !!document.querySelector('[data-experience-preview-ready="true"]'),
      });
      setScreen(previous => previous.pathname === pathname && previous.step?.id === step?.id ? previous : { pathname, step });
    };
    const frame = window.requestAnimationFrame(update);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-experience-step', 'data-experience-customer-ready', 'data-experience-result-ready', 'data-experience-preview-ready'] });
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [pathname]);

  const step = screen.pathname === pathname ? screen.step : null;
  if (!step) return null;
  const storageKey = `experience-guide:v1:${session.dateKey}:${session.sessionId}:${step.id}`;
  return <StepGuide key={storageKey} step={step} storageKey={storageKey} />;
}
