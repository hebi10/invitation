'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';
import { getInvitationThemeMetadata } from '@/lib/invitationThemes';
import styles from './WeddingWizardPreview.module.css';

export default function WeddingWizardPreview({ formState, theme }: {
  formState: InvitationPageSeed;
  theme: InvitationThemeKey;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);
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

  useEffect(() => {
    if (ready) return;
    const timeout = window.setTimeout(() => setTimedOut(true), 15000);
    return () => window.clearTimeout(timeout);
  }, [ready, frameVersion]);

  const reload = () => {
    setReady(false);
    setTimedOut(false);
    setFrameVersion((version) => version + 1);
  };

  return (
    <div className={styles.preview}>
      <div className={styles.toolbar}>
        <span>{getInvitationThemeMetadata(theme).label}</span>
        <button type="button" disabled={!ready} onClick={() => frameRef.current?.contentWindow?.postMessage({ type: 'wedding-wizard-preview:top' }, window.location.origin)}>처음부터 보기</button>
      </div>
      <p className={styles.hint}>화면 안을 스크롤해 전체 청첩장을 확인하세요. 입력한 내용이 바로 반영됩니다.</p>
      {!ready && <div className={styles.status} role="status">{timedOut ? <>미리보기를 불러오지 못했습니다. <button type="button" onClick={reload}>다시 불러오기</button></> : '초대장 미리보기를 준비하고 있습니다.'}</div>}
      <div className={styles.phone}>
        <iframe
        key={frameVersion}
        ref={frameRef}
        className={styles.frame}
        src="/wizard-preview/"
        title={`${getInvitationThemeMetadata(theme).label} 청첩장 미리보기`}
        tabIndex={0}
        onLoad={sendPreview}
      />
      </div>
      <p className={styles.hint}>미입력 정보와 사진은 예시로 표시됩니다. 예시와 미리보기에서 작성한 방명록은 저장되지 않습니다.</p>
    </div>
  );
}
