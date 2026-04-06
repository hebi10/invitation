import { PersonEditorCard } from '@/app/page-editor/pageEditorPanels';

import styles from '../page.module.css';
import { composeGreetingAuthor, GREETING_TEMPLATES } from '../pageWizardData';
import { renderFieldMeta, type GreetingStepProps } from '../pageWizardShared';

export default function GreetingStep({
  formState,
  previewFormState,
  updateForm,
  onPersonFieldChange,
  onParentFieldChange,
}: GreetingStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        {renderFieldMeta('인사말', 'required')}
        <textarea
          className={styles.textarea}
          value={formState.pageData?.greetingMessage ?? ''}
          placeholder="소중한 분들과 기쁜 마음을 나누고 싶습니다. 따뜻한 축복으로 함께해 주세요."
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
        {GREETING_TEMPLATES.map((template) => (
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
        {renderFieldMeta('인사말 서명', 'optional')}
        <input
          className={styles.input}
          value={formState.pageData?.greetingAuthor ?? ''}
          placeholder={composeGreetingAuthor(
            previewFormState.couple.groom.name,
            previewFormState.couple.bride.name
          )}
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.greetingAuthor = event.target.value;
              }
            })
          }
        />
      </label>

      <div className={styles.twoColumnGrid}>
        <PersonEditorCard
          role="groom"
          label="신랑 정보"
          person={formState.couple.groom}
          disabled={false}
          onPersonFieldChange={onPersonFieldChange}
          onParentFieldChange={onParentFieldChange}
        />
        <PersonEditorCard
          role="bride"
          label="신부 정보"
          person={formState.couple.bride}
          disabled={false}
          onPersonFieldChange={onPersonFieldChange}
          onParentFieldChange={onParentFieldChange}
        />
      </div>
    </div>
  );
}
