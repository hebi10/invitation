import styles from '../page.module.css';
import { composeDescription, composeDisplayName } from '../pageWizardData';
import { renderFieldMeta, type BasicStepProps } from '../pageWizardShared';

export default function BasicStep({
  formState,
  previewFormState,
  updateForm,
  onPersonFieldChange,
}: BasicStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta('신랑 이름', 'required')}
          <input
            className={styles.input}
            value={formState.couple.groom.name}
            placeholder="신랑 이름"
            onChange={(event) =>
              onPersonFieldChange('groom', 'name', event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta('신부 이름', 'required')}
          <input
            className={styles.input}
            value={formState.couple.bride.name}
            placeholder="신부 이름"
            onChange={(event) =>
              onPersonFieldChange('bride', 'name', event.target.value)
            }
          />
        </label>
      </div>

      <label className={styles.field}>
        {renderFieldMeta('표지 부제', 'optional')}
        <input
          className={styles.input}
          value={formState.pageData?.subtitle ?? ''}
          placeholder="두 사람이 사랑으로 하나가 되는 날"
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.subtitle = event.target.value;
              }
            })
          }
        />
      </label>

      <label className={styles.field}>
        {renderFieldMeta('표지 제목', 'optional')}
        <input
          className={styles.input}
          value={formState.displayName}
          placeholder={composeDisplayName(
            previewFormState.couple.groom.name,
            previewFormState.couple.bride.name
          )}
          onChange={(event) =>
            updateForm((draft) => {
              draft.displayName = event.target.value;
            })
          }
        />
      </label>

      <label className={styles.field}>
        {renderFieldMeta('소개 문구', 'optional')}
        <textarea
          className={styles.textarea}
          value={formState.description}
          placeholder={composeDescription(
            previewFormState.couple.groom.name,
            previewFormState.couple.bride.name
          )}
          onChange={(event) =>
            updateForm((draft) => {
              draft.description = event.target.value;
            })
          }
        />
      </label>
    </div>
  );
}
