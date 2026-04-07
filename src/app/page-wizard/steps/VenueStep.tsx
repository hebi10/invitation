import styles from '../page.module.css';
import { renderFieldMeta, type VenueStepProps } from '../pageWizardShared';

export default function VenueStep({
  formState,
  isSearchingAddress,
  onSearchAddress,
  updateForm,
}: VenueStepProps) {
  const latitude = formState.pageData?.kakaoMap?.latitude ?? 0;
  const longitude = formState.pageData?.kakaoMap?.longitude ?? 0;
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        {renderFieldMeta('예식장 이름', 'required')}
        <input
          className={styles.input}
          value={formState.venue}
          placeholder="예식장 이름"
          onChange={(event) =>
            updateForm((draft) => {
              const previousVenueName = draft.pageData?.venueName?.trim() ?? draft.venue.trim();
              draft.venue = event.target.value;

              if (!draft.pageData) {
                return;
              }

              draft.pageData.venueName = event.target.value;
              if (
                draft.pageData.kakaoMap &&
                (!draft.pageData.kakaoMap.markerTitle?.trim() ||
                  draft.pageData.kakaoMap.markerTitle.trim() === previousVenueName)
              ) {
                draft.pageData.kakaoMap.markerTitle = event.target.value;
              }
            })
          }
        />
      </label>

      <label className={styles.field}>
        {renderFieldMeta(
          '주소',
          'required',
          '주소 입력 후 버튼을 누르면 카카오 좌표와 지도 링크를 자동으로 가져옵니다.'
        )}
        <input
          className={styles.input}
          value={formState.pageData?.ceremonyAddress ?? ''}
          placeholder="예식장 주소"
          onChange={(event) =>
            updateForm((draft) => {
              if (!draft.pageData) {
                return;
              }

              draft.pageData.ceremonyAddress = event.target.value;

              if (draft.pageData.mapUrl?.startsWith('https://map.kakao.com/link/search/')) {
                draft.pageData.mapUrl = '';
              }

              if (draft.pageData.kakaoMap) {
                draft.pageData.kakaoMap = {
                  ...draft.pageData.kakaoMap,
                  latitude: 0,
                  longitude: 0,
                };
              }
            })
          }
        />
      </label>

      <div className={styles.inlineActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onSearchAddress}
          disabled={isSearchingAddress || !(formState.pageData?.ceremonyAddress ?? '').trim()}
        >
          {isSearchingAddress ? '주소 확인 중' : '주소로 좌표 찾기'}
        </button>
        <span className={hasCoordinates ? styles.choiceSectionBadge : styles.autoStatusHint}>
          {hasCoordinates ? '자동 입력 완료' : '위도, 경도, 지도 링크가 자동 입력됩니다.'}
        </span>
      </div>

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
        {renderFieldMeta('안내 문구', 'optional')}
        <textarea
          className={styles.textarea}
          value={formState.pageData?.mapDescription ?? ''}
          placeholder="예식장 건물 뒤 주차장을 이용하실 수 있습니다."
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
