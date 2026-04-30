import styles from '../page.module.css';
import { BIRTHDAY_GREETING_TEMPLATES, DEFAULT_BIRTHDAY_GREETING_MESSAGE } from '../pageWizardData';
import { renderFieldMeta, type GreetingStepProps } from '../pageWizardShared';

export default function BirthdayGreetingStep({
  formState,
  updateForm,
}: GreetingStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        {renderFieldMeta('초대 문구', 'required')}
        <textarea
          className={styles.textarea}
          value={formState.pageData?.greetingMessage ?? ''}
          placeholder={DEFAULT_BIRTHDAY_GREETING_MESSAGE}
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.greetingMessage = event.target.value;
              }
            })
          }
        />
      </label>

      <div className={styles.templateRow}>
        {BIRTHDAY_GREETING_TEMPLATES.map((template) => (
          <button
            key={template.label}
            type="button"
            className={styles.templateButton}
            onClick={() =>
              updateForm((draft) => {
                if (draft.pageData) {
                  draft.pageData.greetingMessage = template.value;
                }
              })
            }
          >
            {template.label}
          </button>
        ))}
      </div>

      <label className={styles.field}>
        {renderFieldMeta('초대장 서명', 'optional')}
        <input
          className={styles.input}
          value={formState.pageData?.greetingAuthor ?? ''}
          placeholder={formState.couple.groom.name || '생일 주인공'}
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.greetingAuthor = event.target.value;
              }
            })
          }
        />
      </label>
    </div>
  );
}
