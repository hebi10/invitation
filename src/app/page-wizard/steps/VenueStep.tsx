import { WizardField } from '../WizardFieldValidation';
import VenueLocationPreview from './VenueLocationPreview';
import styles from '../page.module.css';
import locationStyles from './VenueLocationPreview.module.css';
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
  const selectedAddress = formState.pageData?.ceremonyAddress?.trim() ?? '';
  const selectedVenueName = formState.pageData?.venueName?.trim() || formState.venue.trim();
  const markerTitle =
    formState.pageData?.kakaoMap?.markerTitle?.trim() || selectedVenueName || selectedAddress;
  const isFirstBirthday = formState.eventType === 'first-birthday';
  const isGeneralEvent = formState.eventType === 'general-event';
  const venueLabel = formState.eventType === 'opening' ? '매장' : isGeneralEvent ? '행사 장소' : isFirstBirthday ? '돌잔치 장소' : '예식장';

  return (
    <section className={`${styles.fieldGrid} ${locationStyles.venueSection}`} aria-label="장소 안내 입력">
      <h3 className={locationStyles.sectionTitle}>장소 안내</h3>
      <WizardField label={`${venueLabel} 이름`} className={styles.field}>
        {renderFieldMeta(`${venueLabel} 이름`, 'required')}
        <input
          className={styles.input}
          value={formState.venue}
          placeholder={`${venueLabel} 이름`}
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
      </WizardField>

      <WizardField label={'주소'} className={styles.field}>
        {renderFieldMeta(
          '주소',
          'required',
          '도로명 또는 지번 주소를 입력한 뒤 지도 위치를 확인해 주세요.',
        )}
        <input
          className={styles.input}
          value={formState.pageData?.ceremonyAddress ?? ''}
          placeholder={`${venueLabel} 주소`}
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
      </WizardField>

      <div className={styles.inlineActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onSearchAddress}
          disabled={isSearchingAddress || !(formState.pageData?.ceremonyAddress ?? '').trim()}
        >
          {isSearchingAddress ? '위치 확인 중' : '지도 위치 확인'}
        </button>
        <span className={hasCoordinates ? styles.choiceSectionBadge : styles.autoStatusHint}>
          {hasCoordinates ? '지도 위치 확인 완료' : '주소를 입력하고 지도 위치를 확인해 주세요.'}
        </span>
      </div>

      {selectedAddress ? (
        <VenueLocationPreview
          venueName={selectedVenueName}
          address={selectedAddress}
          latitude={latitude}
          longitude={longitude}
          markerTitle={markerTitle}
          venueLabel={venueLabel}
        />
      ) : null}

      <WizardField label={`${venueLabel} 연락처`} className={styles.field}>
        {renderFieldMeta(`${venueLabel} 연락처`, 'optional')}
        <input
          className={styles.input}
          type="tel"
          inputMode="tel"
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
      </WizardField>

      <WizardField label={'오시는 길 안내 문구'} className={styles.field}>
        {renderFieldMeta('오시는 길 안내 문구', 'optional')}
        <textarea
          className={styles.textarea}
          value={formState.pageData?.mapDescription ?? ''}
          placeholder={
            isGeneralEvent
              ? '행사장 주차장 또는 대중교통 안내를 입력해 주세요.'
              : isFirstBirthday
              ? '건물 내 주차장 또는 발렛 이용 안내를 입력해 주세요.'
              : '예식장 건물 뒤 주차장을 이용하실 수 있습니다.'
          }
          onChange={(event) =>
            updateForm((draft) => {
              if (draft.pageData) {
                draft.pageData.mapDescription = event.target.value;
              }
            })
          }
        />
      </WizardField>
    </section>
  );
}
