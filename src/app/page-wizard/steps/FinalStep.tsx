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
        {renderFieldMeta('공유 제목', 'optional', '카카오톡 등으로 링크를 보낼 때 표시되는 제목입니다.')}
        <input
          className={styles.input}
          value={formState.metadata.title}
          placeholder={previewFormState.metadata.title}
          onChange={(event) =>
            updateForm((draft) => {
              draft.metadata.title = event.target.value;
              draft.metadata.openGraph.title = event.target.value;
              draft.metadata.twitter.title = event.target.value;
            })
          }
        />
      </label>
      <label className={styles.field}>
        {renderFieldMeta('공유 설명', 'optional', '링크를 보냈을 때 제목 아래에 표시되는 짧은 설명입니다. 초대장 본문에는 표시되지 않습니다.')}
        <textarea
          className={styles.textarea}
          value={formState.metadata.description}
          placeholder={previewFormState.metadata.description}
          onChange={(event) =>
            updateForm((draft) => {
              draft.metadata.description = event.target.value;
              draft.metadata.openGraph.description = event.target.value;
              draft.metadata.twitter.description = event.target.value;
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
      <p className={styles.sectionText}>
        {published
          ? '저장하면 입력한 내용이 공개 페이지에 반영됩니다. 링크를 받은 손님이 볼 수 있습니다.'
          : '공개하지 않고 저장합니다. 손님에게 보내기 전에 공개 여부를 확인해 주세요.'}
      </p>
    </div>
  );
}
