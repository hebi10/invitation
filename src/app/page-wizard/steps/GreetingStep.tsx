import { WizardField } from '../WizardFieldValidation';
import { PersonEditorCard } from '@/app/page-wizard/pageWizardEditorPanels';

import TemplateChoiceGroup from '../TemplateChoiceGroup';
import styles from '../page.module.css';
import {
  composeGreetingAuthor,
  DEFAULT_GREETING_MESSAGE,
  DEFAULT_OPENING_GREETING_MESSAGE,
  GREETING_TEMPLATES,
} from '../pageWizardData';
import { renderFieldMeta, type GreetingStepProps } from '../pageWizardShared';

export default function GreetingStep({
  formState,
  previewFormState,
  updateForm,
  onPersonFieldChange,
  onParentFieldChange,
  mode = 'all',
}: GreetingStepProps & { mode?: 'all' | 'greeting' | 'family' }) {
  const familyFields = (
    <div className={styles.fieldGrid}>
      {(['groom', 'bride'] as const).map((role) => (
        <PersonEditorCard
          key={role}
          role={role}
          label={role === 'groom' ? '신랑·가족 정보' : '신부·가족 정보'}
          nameReadOnly={formState.eventType === 'wedding'}
          person={formState.couple[role]}
          disabled={false}
          onPersonFieldChange={onPersonFieldChange}
          onParentFieldChange={onParentFieldChange}
        />
      ))}
    </div>
  );
  if (mode === 'family') return formState.eventType === 'wedding' ? familyFields : null;
  if (formState.eventType === 'first-birthday') {
    return (
      <div className={styles.fieldGrid}>
        <WizardField label={'인사말'} className={styles.field}>
          {renderFieldMeta('인사말', 'required')}
          <textarea
            className={styles.textarea}
            value={formState.pageData?.greetingMessage ?? ''}
            placeholder={`${previewFormState.displayName || '아기'}의 첫 번째 생일을 함께 축하해 주세요.`}
            onChange={(event) =>
              updateForm((draft) => {
                if (draft.pageData) {
                  draft.pageData.greetingMessage = event.target.value;
                }
              })
            }
          />
        </WizardField>

        <WizardField label={'인사말 서명'} className={styles.field}>
          {renderFieldMeta('인사말 서명', 'optional')}
          <input
            className={styles.input}
            value={formState.pageData?.greetingAuthor ?? ''}
            placeholder="아빠 · 엄마 드림"
            onChange={(event) =>
              updateForm((draft) => {
                if (draft.pageData) {
                  draft.pageData.greetingAuthor = event.target.value;
                }
              })
            }
          />
        </WizardField>
      </div>
    );
  }

  if (formState.eventType === 'opening') {
    return (
      <div className={styles.fieldGrid}>
        <WizardField label={'개업 인사말'} className={styles.field}>
          {renderFieldMeta('개업 인사말', 'required')}
          <textarea
            className={styles.textarea}
            value={formState.pageData?.greetingMessage ?? ''}
            placeholder={DEFAULT_OPENING_GREETING_MESSAGE}
            onChange={(event) =>
              updateForm((draft) => {
                if (draft.pageData) {
                  draft.pageData.greetingMessage = event.target.value;
                }
              })
            }
          />
        </WizardField>

        <WizardField label={'인사말 서명'} className={styles.field}>
          {renderFieldMeta('인사말 서명', 'optional')}
          <input
            className={styles.input}
            value={formState.pageData?.greetingAuthor ?? ''}
            placeholder={previewFormState.displayName || '대표'}
            onChange={(event) =>
              updateForm((draft) => {
                if (draft.pageData) {
                  draft.pageData.greetingAuthor = event.target.value;
                }
              })
            }
          />
        </WizardField>
      </div>
    );
  }

  return (
    <div className={styles.fieldGrid}>
      <WizardField label={'인사말'} className={styles.field}>
        {renderFieldMeta('인사말', 'required')}
        <textarea
          className={styles.textarea}
          value={formState.pageData?.greetingMessage ?? ''}
          placeholder={DEFAULT_GREETING_MESSAGE}
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.greetingMessage = event.target.value;
              }
            })
          }
        />
      </WizardField>

      <TemplateChoiceGroup
        labelId="greeting-template-title"
        title="인사말 템플릿"
        description="문구를 미리 보고 마음에 드는 인사말을 적용해 주세요."
        templates={GREETING_TEMPLATES}
        value={formState.pageData?.greetingMessage ?? ''}
        onSelect={(value) =>
          updateForm((draft) => {
            if (draft.pageData) {
              draft.pageData.greetingMessage = value;
            }
          })
        }
      />

      <WizardField label={'인사말 서명'} className={styles.field}>
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
      </WizardField>

      {mode === 'all' ? familyFields : null}
    </div>
  );
}
