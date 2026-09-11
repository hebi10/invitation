'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { normalizeWeddingIntroStyle, WEDDING_INTRO_OPTIONS, type WeddingIntroStyle } from '@/lib/weddingIntro';
import type { InvitationThemeKey } from '@/types/invitationPage';
import type { WizardStepProps } from '../pageWizardShared';
import styles from './IntroSettings.module.css';

const WeddingWizardPreview = dynamic(() => import('../WeddingWizardPreview'), { ssr: false });

export default function IntroSettings({ formState, updateForm, theme }: WizardStepProps & { theme: InvitationThemeKey }) {
  const [preview, setPreview] = useState<{ style: WeddingIntroStyle; version: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (preview) previewRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [preview]);
  const selectedStyle = normalizeWeddingIntroStyle(formState.introStyle);

  return (
    <section className={styles.section} aria-labelledby="intro-settings-title">
      <div>
        <h3 id="intro-settings-title" className={styles.title}>첫 화면 연출</h3>
        <p className={styles.description}>하객이 청첩장을 처음 열었을 때 보여줄 장면입니다. 입력한 이름과 대표 사진으로 연출을 확인해 보세요.</p>
      </div>
      <fieldset className={styles.options}>
        <legend className={styles.legend}>첫 화면 연출 선택</legend>
        {WEDDING_INTRO_OPTIONS.map(option => (
          <div key={option.value} className={styles.option} data-selected={selectedStyle === option.value}>
            <label className={styles.choice}>
              <input type="radio" name="wedding-intro-style" value={option.value} checked={selectedStyle === option.value} onChange={() => updateForm(draft => { draft.introStyle = option.value; })} />
              <span><strong>{option.label}</strong><span className={styles.description}>{option.description}</span></span>
            </label>
            {option.value !== 'none' ? (
              <button type="button" className={styles.previewButton} aria-label={`${option.label} 연출 보기`} onClick={() => setPreview(current => ({ style: option.value, version: (current?.version ?? 0) + 1 }))}>연출 보기</button>
            ) : null}
          </div>
        ))}
      </fieldset>
      <p className={styles.description}>연출 보기는 저장하지 않고 미리 확인하는 기능입니다. 선택 후 저장하면 실제 청첩장에 적용됩니다. 같은 탭에서 다시 방문하면 연출은 생략됩니다.</p>
      {preview ? (
        <div ref={previewRef} className={styles.inlinePreview}>
          <div className={styles.previewHeading}>
            <h3 className={styles.title}>{WEDDING_INTRO_OPTIONS.find(option => option.value === preview.style)?.label} 미리보기</h3>
            <button type="button" className={styles.previewButton} onClick={() => setPreview(null)}>미리보기 닫기</button>
          </div>
          <WeddingWizardPreview key={preview.version} formState={{ ...formState, introStyle: preview.style }} theme={theme} />
        </div>
      ) : null}
    </section>
  );
}
