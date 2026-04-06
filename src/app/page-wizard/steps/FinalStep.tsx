import { keywordsToText, textToKeywords } from '@/app/page-editor/pageEditorUtils';

import styles from '../page.module.css';
import { renderFieldMeta, type FinalStepProps } from '../pageWizardShared';

export default function FinalStep({
  formState,
  previewFormState,
  updateForm,
  published,
  setPublished,
}: FinalStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        {renderFieldMeta('브라우저 제목', 'optional')}
        <input
          className={styles.input}
          value={formState.metadata.title}
          placeholder={previewFormState.metadata.title}
          onChange={(event) =>
            updateForm((draft) => {
              draft.metadata.title = event.target.value;
            })
          }
        />
      </label>
      <label className={styles.field}>
        {renderFieldMeta('브라우저 설명', 'optional')}
        <textarea
          className={styles.textarea}
          value={formState.metadata.description}
          placeholder={previewFormState.metadata.description}
          onChange={(event) =>
            updateForm((draft) => {
              draft.metadata.description = event.target.value;
            })
          }
        />
      </label>
      <label className={styles.field}>
        {renderFieldMeta('키워드', 'optional', '쉼표로 구분해서 입력합니다.')}
        <input
          className={styles.input}
          value={keywordsToText(formState.metadata.keywords)}
          placeholder="청첩장, 결혼식, 모바일 초대장"
          onChange={(event) =>
            updateForm((draft) => {
              draft.metadata.keywords = textToKeywords(event.target.value);
            })
          }
        />
      </label>
      <label className={styles.switchRow}>
        <input
          type="checkbox"
          checked={published}
          onChange={(event) => setPublished(event.target.checked)}
        />
        저장 후 바로 공개하기
      </label>
    </div>
  );
}
