'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';
import { getInvitationThemeLabel } from '@/lib/invitationThemes';
import { getWeddingPreviewThemeKeys, isWeddingPreviewThemeKey } from '@/lib/eventPreviewLinks';
import { normalizeWeddingIntroStyle, WEDDING_INTRO_OPTIONS, type WeddingIntroStyle } from '@/lib/weddingIntro';
import { isPreviewStep, previewSections, type PreviewStep } from '../wizard-preview/previewSections';
import styles from './WeddingWizardPreview.module.css';

export type WeddingIntroPreview = { style: Exclude<WeddingIntroStyle, 'none'> };

export default function WeddingWizardPreview({ formState, theme, activeStepKey = 'basic', introPreview = null, onThemeChange }: {
  formState: InvitationPageSeed;
  theme: InvitationThemeKey;
  activeStepKey?: PreviewStep;
  introPreview?: WeddingIntroPreview | null;
  onThemeChange?: (theme: InvitationThemeKey) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const [focusedStep, setFocusedStep] = useState(activeStepKey);
  const [viewingTop, setViewingTop] = useState(false);
  const lastIntroPreview = useRef<WeddingIntroPreview | null>(null);
  const sendPreview = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'wedding-wizard-preview:update', formState: introPreview ? { ...formState, introStyle: introPreview.style } : formState, theme },
      window.location.origin,
    );
  }, [formState, theme, introPreview]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === 'wedding-wizard-preview:rendered') {
        setReady(true);
        setTimedOut(false);
        return;
      }
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

  const focusSection = useCallback((step: PreviewStep = focusedStep) => {
    setViewingTop(false);
    frameRef.current?.contentWindow?.postMessage({ type: 'wedding-wizard-preview:section', step }, window.location.origin);
  }, [focusedStep]);
  useEffect(() => { if (ready && !introPreview) focusSection(); }, [ready, focusSection, introPreview]);
  useEffect(() => { setFocusedStep(activeStepKey); }, [activeStepKey]);
  useEffect(() => {
    const focus = (event: Event) => {
      const step: unknown = (event as CustomEvent<{ step?: unknown }>).detail?.step;
      if (!isPreviewStep(step)) return;
      setFocusedStep(step);
      focusSection(step);
    };
    window.addEventListener('wizard-preview-focus', focus);
    return () => window.removeEventListener('wizard-preview-focus', focus);
  }, [focusSection]);

  useEffect(() => {
    if (!introPreview) {
      lastIntroPreview.current = null;
      return;
    }
    if (!ready || lastIntroPreview.current === introPreview) return;
    lastIntroPreview.current = introPreview;
    sendPreview();
    setViewingTop(true);
    frameRef.current?.contentWindow?.postMessage({ type: 'wedding-wizard-preview:top' }, window.location.origin);
  }, [ready, introPreview, sendPreview]);

  const reload = () => {
    lastIntroPreview.current = null;
    setReady(false);
    setTimedOut(false);
    setFrameVersion((version) => version + 1);
  };

  return (
    <div className={styles.preview}>
      <div className={styles.toolbar}>
        {onThemeChange ? <label className={styles.themeSelect}>
          <span>미리볼 디자인</span>
          <select value={theme} onChange={event => {
            const nextTheme = event.target.value;
            if (isWeddingPreviewThemeKey(nextTheme)) onThemeChange(nextTheme);
          }}>
            {getWeddingPreviewThemeKeys().map(option => <option key={option} value={option}>{getInvitationThemeLabel(option)}</option>)}
          </select>
        </label> : <span>{getInvitationThemeLabel(theme)}</span>}
        <button type="button" disabled={!ready} aria-pressed={!viewingTop} onClick={() => focusSection()}>편집 위치 보기</button>
        <button type="button" disabled={!ready} aria-pressed={viewingTop} onClick={() => {
          setViewingTop(true);
          frameRef.current?.contentWindow?.postMessage({ type: 'wedding-wizard-preview:top' }, window.location.origin);
        }}>{normalizeWeddingIntroStyle(introPreview?.style ?? formState.introStyle) === 'none' ? '처음부터 보기' : '인트로부터 다시 보기'}</button>
      </div>
      {!ready && <div className={styles.status} role="status">{timedOut ? <>미리보기를 불러오지 못했습니다. <button type="button" onClick={reload}>다시 불러오기</button></> : '초대장 미리보기를 준비하고 있습니다.'}</div>}
      <div className={styles.phone}>
        <iframe
          key={frameVersion}
          ref={frameRef}
          className={styles.frame}
          src="/wizard-preview/"
          title={`${getInvitationThemeLabel(theme)} 청첩장 미리보기`}
          tabIndex={0}
          onLoad={sendPreview}
        />
      </div>
      <p className={styles.location} role="status">{introPreview ? `${WEDDING_INTRO_OPTIONS.find(option => option.value === introPreview.style)?.label} 미리보기 · 저장되지 않습니다.` : viewingTop ? '청첩장을 처음부터 보고 있습니다.' : `편집 위치 · ${previewSections[focusedStep].label}`}</p>
      <details className={styles.previewHelp}>
        <summary>미리보기 안내</summary>
        <p className={styles.hint}>저장 전 내용이 반영됩니다. 미입력 정보와 사진은 예시이며 저장되지 않습니다. 지도는 실제 페이지에서 확인할 수 있고, 미리보기 방명록은 연습용입니다.{onThemeChange ? ' 디자인 선택은 미리보기에만 적용됩니다.' : ''}</p>
      </details>
    </div>
  );
}
