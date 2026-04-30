import styles from '../page.module.css';
import { renderFieldMeta, type BasicStepProps } from '../pageWizardShared';

export default function BirthdayBasicStep({
  formState,
  updateForm,
  onPersonFieldChange,
}: BasicStepProps) {
  const birthdayName = formState.couple.groom.name;

  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        {renderFieldMeta('생일 주인공 이름', 'required')}
        <input
          className={styles.input}
          value={birthdayName}
          placeholder="생일 주인공 이름"
          onChange={(event) => {
            const nextName = event.target.value;
            onPersonFieldChange('groom', 'name', nextName);
            updateForm((draft) => {
              draft.groomName = nextName;
              draft.brideName = '';
              draft.couple.bride.name = '';
              if (!draft.displayName.trim()) {
                draft.displayName = nextName;
              }
              if (draft.pageData && !draft.pageData.greetingAuthor?.trim()) {
                draft.pageData.greetingAuthor = nextName;
              }
            });
          }}
        />
      </label>

      <label className={styles.field}>
        {renderFieldMeta('표지 부제', 'optional')}
        <input
          className={styles.input}
          value={formState.pageData?.subtitle ?? ''}
          placeholder="소중한 분들과 함께하는 특별한 하루"
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
          placeholder={birthdayName || '생일 주인공'}
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
          placeholder="소중한 생일 자리에 초대합니다."
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
