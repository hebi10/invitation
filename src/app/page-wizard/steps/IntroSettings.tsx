'use client';

import { normalizeWeddingIntroStyle, WEDDING_INTRO_OPTIONS } from '@/lib/weddingIntro';
import type { WizardStepProps } from '../pageWizardShared';
import styles from './IntroSettings.module.css';

export default function IntroSettings({ formState, updateForm }: WizardStepProps) {
  const selectedStyle = normalizeWeddingIntroStyle(formState.introStyle);

  return (
    <section className={styles.section} aria-labelledby="intro-settings-title">
      <div>
        <h3 id="intro-settings-title" className={styles.title}>첫 화면 연출</h3>
        <p className={styles.description}>청첩장을 처음 열 때 보여줄 연출을 선택해 주세요.</p>
      </div>
      <fieldset className={styles.options}>
        <legend className={styles.legend}>첫 화면 연출 선택</legend>
        {WEDDING_INTRO_OPTIONS.map(option => (
          <div key={option.value} className={styles.option} data-selected={selectedStyle === option.value}>
            <label className={styles.choice}>
              <input type="radio" name="wedding-intro-style" value={option.value} checked={selectedStyle === option.value} aria-labelledby={`intro-option-${option.value}`} aria-describedby={`intro-description-${option.value}`} onChange={() => updateForm(draft => { draft.introStyle = option.value; })} />
              <span className={styles.choiceCopy}>
                <span className={styles.choiceHeading}>
                  <strong id={`intro-option-${option.value}`}>{option.label}</strong>
                  {selectedStyle === option.value ? <span className={styles.selectedLabel} aria-hidden="true">선택됨</span> : null}
                </span>
                <span id={`intro-description-${option.value}`} className={styles.optionDescription}>{option.description}</span>
              </span>
            </label>
            {option.value !== 'none' ? (
              <button type="button" className={styles.previewButton} aria-label={`${option.label} 연출 보기`} onClick={() => window.dispatchEvent(new CustomEvent('wizard-preview-intro', { detail: { style: option.value } }))}>연출 보기</button>
            ) : null}
          </div>
        ))}
      </fieldset>
      <p className={styles.description}>연출 보기는 미리보기에서 재생됩니다. 저장 후 적용되며 같은 탭에서는 처음 방문할 때만 표시됩니다.</p>
    </section>
  );
}
