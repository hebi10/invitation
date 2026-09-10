'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';
import styles from './WeddingWizardPreview.module.css';

export default function WeddingWizardPreview({ formState, theme }: {
  formState: InvitationPageSeed;
  theme: InvitationThemeKey;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const sendPreview = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'wedding-wizard-preview:update', formState, theme },
      window.location.origin,
    );
  }, [formState, theme]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== 'wedding-wizard-preview:ready') return;
      setReady(true);
      sendPreview();
    };
    window.addEventListener('message', receive);
    sendPreview();
    return () => window.removeEventListener('message', receive);
  }, [sendPreview]);

  return (
    <div className={styles.preview}>
      <p className={styles.notice}>입력한 내용이 바로 반영됩니다. 비어 있는 필수 정보와 사진은 예시로 표시되며 저장되지 않습니다.</p>
      {!ready && <p className={styles.status} role="status">초대장 미리보기를 준비하고 있습니다.</p>}
      <iframe
        ref={frameRef}
        className={styles.frame}
        src="/wizard-preview/"
        title="입력 내용이 반영된 청첩장 미리보기"
        tabIndex={0}
        onLoad={sendPreview}
      />
    </div>
  );
}
