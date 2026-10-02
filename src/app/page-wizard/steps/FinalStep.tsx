import { useState, type ReactNode } from 'react';

import styles from '../page.module.css';
import { renderFieldMeta, type FinalStepProps } from '../pageWizardShared';
import finalStyles from './FinalStep.module.css';
import previewStyles from './ShareImagePreview.module.css';

export default function FinalStep({
  formState,
  previewFormState,
  updateForm,
  published,
  setPublished,
  canManagePublication = false,
  children,
}: FinalStepProps & { children?: ReactNode }) {
  const shareImage = previewFormState.metadata.images.social?.trim()
    || previewFormState.metadata.images.wedding?.trim()
    || '';
  const [failedImage, setFailedImage] = useState('');
  const shareTitle = previewFormState.metadata.openGraph.title
    || previewFormState.metadata.title
    || previewFormState.displayName
    || '초대합니다';
  const shareDescription = previewFormState.metadata.openGraph.description
    || previewFormState.metadata.description
    || previewFormState.description
    || [previewFormState.date, previewFormState.venue].filter(Boolean).join(' · ');

  return (
    <div className={styles.fieldGrid}>
      <section className={finalStyles.shareSummary} aria-labelledby="wizard-share-preview-title">
        <div>
          <h3 id="wizard-share-preview-title" className={styles.cardTitle}>공유 카드 확인</h3>
          <p className={styles.cardText}>링크를 보냈을 때 표시되는 사진과 문구입니다.</p>
        </div>
        <div className={previewStyles.card}>
          {shareImage && failedImage !== shareImage ? (
            <img
              className={previewStyles.image}
              src={shareImage}
              alt="공유 카드 이미지"
              onError={() => setFailedImage(shareImage)}
            />
          ) : (
            <div className={previewStyles.empty}>
              {shareImage ? '이미지를 불러오지 못했습니다. 아래에서 공유 이미지를 확인해 주세요.' : '사진 단계에서 대표 이미지를 등록하면 여기에 표시됩니다.'}
            </div>
          )}
          <div className={previewStyles.copy}>
            <strong>{shareTitle}</strong>
            <p>{shareDescription || '소중한 날 함께해 주세요.'}</p>
            <span>초대장 링크</span>
          </div>
        </div>
      </section>
      <details className={finalStyles.shareDetails}>
        <summary className={finalStyles.shareDetailsSummary}>공유 이미지·문구 변경</summary>
        <div className={finalStyles.shareDetailsBody}>
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
          {children}
        </div>
      </details>
      {canManagePublication ? <label className={styles.switchRow}>
        <input
          type="checkbox"
          checked={published}
          onChange={(event) => setPublished(event.target.checked)}
        />
        저장 후 바로 공개하기
      </label> : null}
      <p className={styles.sectionText}>
        {!canManagePublication ? (published ? '저장하면 공개 중인 청첩장에 반영됩니다.' : '입력한 내용을 저장합니다. 공개 여부는 관리자가 설정합니다.') : published
          ? '저장하면 입력한 내용이 공개 페이지에 반영됩니다. 링크를 받은 손님이 볼 수 있습니다.'
          : '공개하지 않고 저장합니다. 손님에게 보내기 전에 공개 여부를 확인해 주세요.'}
      </p>
    </div>
  );
}
