import styles from '../page.module.css';
import { composeDescription, composeDisplayName } from '../pageWizardData';
import { renderFieldMeta, type BasicStepProps } from '../pageWizardShared';

export default function BasicStep({
  formState,
  previewFormState,
  updateForm,
  onPersonFieldChange,
}: BasicStepProps) {
  if (formState.eventType === 'first-birthday') {
    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          {renderFieldMeta('아기 이름', 'required')}
          <input
            className={styles.input}
            value={formState.displayName}
            placeholder="아기 이름"
            onChange={(event) =>
              updateForm((draft) => {
                draft.displayName = event.target.value;
                draft.metadata.title = event.target.value;
              })
            }
          />
        </label>

        <div className={styles.twoColumnGrid}>
          <label className={styles.field}>
            {renderFieldMeta('아빠 이름', 'required')}
            <input
              className={styles.input}
              value={formState.couple.groom.name}
              placeholder="아빠 이름"
              onChange={(event) =>
                onPersonFieldChange('groom', 'name', event.target.value)
              }
            />
          </label>
          <label className={styles.field}>
            {renderFieldMeta('엄마 이름', 'required')}
            <input
              className={styles.input}
              value={formState.couple.bride.name}
              placeholder="엄마 이름"
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
            placeholder="첫 번째 생일잔치에 초대합니다"
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
          {renderFieldMeta('소개 문구', 'optional')}
          <textarea
            className={styles.textarea}
            value={formState.description}
            placeholder={`${formState.displayName || '아기'}의 첫 번째 생일잔치에 초대합니다.`}
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

  if (formState.eventType === 'general-event') {
    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          {renderFieldMeta('행사명', 'required')}
          <input
            className={styles.input}
            value={formState.displayName}
            placeholder="팀 창립 5주년 파티"
            onChange={(event) =>
              updateForm((draft) => {
                draft.displayName = event.target.value;
                draft.groomName = event.target.value;
                draft.couple.groom.name = event.target.value;
                draft.metadata.title = event.target.value;
              })
            }
          />
        </label>

        <label className={styles.field}>
          {renderFieldMeta('행사 라벨', 'optional')}
          <input
            className={styles.input}
            value={formState.pageData?.subtitle ?? ''}
            placeholder="Anniversary Party"
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
          {renderFieldMeta('행사 소개 문구', 'optional')}
          <textarea
            className={styles.textarea}
            value={formState.description}
            placeholder="함께 만든 시간을 축하하는 자리에 초대합니다."
            onChange={(event) =>
              updateForm((draft) => {
                draft.description = event.target.value;
                draft.metadata.description = event.target.value;
                draft.metadata.openGraph.description = event.target.value;
                draft.metadata.twitter.description = event.target.value;
              })
            }
          />
        </label>
      </div>
    );
  }

  if (formState.eventType === 'opening') {
    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          {renderFieldMeta('상호명', 'required')}
          <input
            className={styles.input}
            value={formState.displayName}
            placeholder="카페 블루밍"
            onChange={(event) =>
              updateForm((draft) => {
                draft.displayName = event.target.value;
                draft.groomName = event.target.value;
                draft.couple.groom.name = event.target.value;
                draft.metadata.title = event.target.value;
              })
            }
          />
        </label>

        <label className={styles.field}>
          {renderFieldMeta('영문명 또는 브랜드 라벨', 'optional')}
          <input
            className={styles.input}
            value={formState.pageData?.subtitle ?? ''}
            placeholder="CAFÉ BLOOMING"
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
          {renderFieldMeta('태그라인', 'optional')}
          <textarea
            className={styles.textarea}
            value={formState.description}
            placeholder="꽃처럼 피어나는 일상의 향기"
            onChange={(event) =>
              updateForm((draft) => {
                draft.description = event.target.value;
                draft.metadata.description = event.target.value;
                draft.metadata.openGraph.description = event.target.value;
                draft.metadata.twitter.description = event.target.value;
              })
            }
          />
        </label>
      </div>
    );
  }

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
