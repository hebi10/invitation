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
        {renderFieldMeta('공유 제목', 'optional', '카카오톡이나 문자로 공유할 때 보이는 제목입니다.')}
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
        {renderFieldMeta('공유 설명', 'optional', '링크 미리보기 아래에 보일 짧은 설명입니다.')}
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
