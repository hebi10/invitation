import styles from '../page.module.css';
import { renderFieldMeta, type VenueStepProps } from '../pageWizardShared';

export default function VenueStep({
  formState,
  updateForm,
}: VenueStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        {renderFieldMeta('예식장 이름', 'required')}
        <input
          className={styles.input}
          value={formState.venue}
          placeholder="더케이웨딩홀"
          onChange={(event) =>
            updateForm((draft) => {
              draft.venue = event.target.value;
              if (draft.pageData) {
                draft.pageData.venueName = event.target.value;
              }
            })
          }
        />
      </label>

      <label className={styles.field}>
        {renderFieldMeta('주소', 'required')}
        <input
          className={styles.input}
          value={formState.pageData?.ceremonyAddress ?? ''}
          placeholder="서울시 강남구 테헤란로 123"
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.ceremonyAddress = event.target.value;
              }
            })
          }
        />
      </label>
      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta('예식장 연락처', 'optional')}
          <input
            className={styles.input}
            value={formState.pageData?.ceremonyContact ?? ''}
            placeholder="02-1234-5678"
            onChange={(event) =>
              updateForm((draft) => {
                if (draft.pageData) {
                  draft.pageData.ceremonyContact = event.target.value;
                }
              })
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta('지도 링크', 'optional')}
          <input
            className={styles.input}
            value={formState.pageData?.mapUrl ?? ''}
            placeholder="https://map.kakao.com/..."
            onChange={(event) =>
              updateForm((draft) => {
                if (draft.pageData) {
                  draft.pageData.mapUrl = event.target.value;
                }
              })
            }
          />
        </label>
      </div>

      <label className={styles.field}>
        {renderFieldMeta('안내 문구', 'optional')}
        <textarea
          className={styles.textarea}
          value={formState.pageData?.mapDescription ?? ''}
          placeholder="예식장 건물 내 주차장을 이용하실 수 있습니다."
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.mapDescription = event.target.value;
              }
            })
          }
        />
      </label>
    </div>
  );
}
