import styles from '../page.module.css';
import { renderFieldMeta, type SlugStepProps } from '../pageWizardShared';

export default function SlugStep({
  slugInput,
  setSlugInput,
  normalizedSlugInput,
  persistedSlug,
  previewSlug,
}: SlugStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        {renderFieldMeta(
          '페이지 주소',
          'required',
          '영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.'
        )}
        <input
          className={styles.input}
          value={slugInput}
          placeholder="shin-minje-kim-hyunji"
          onChange={(event) => setSlugInput(event.target.value)}
          onBlur={() => {
            if (!persistedSlug && normalizedSlugInput) {
              setSlugInput(normalizedSlugInput);
            }
          }}
          disabled={Boolean(persistedSlug)}
        />
      </label>

      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>주소 미리보기</span>
        <strong className={styles.summaryValue}>/{previewSlug}</strong>
        <p className={styles.sectionText}>
          이 단계를 확인하면 초안 문서가 먼저 생성됩니다.
        </p>
      </div>
    </div>
  );
}
