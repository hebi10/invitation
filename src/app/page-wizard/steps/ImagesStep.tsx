import { useEffect, useState } from 'react';

import styles from '../page.module.css';
import { renderFieldMeta, type ImagesStepProps } from '../pageWizardShared';

export default function ImagesStep({
  formState,
  previewFormState,
  updateForm,
  canUploadImages,
  maxGalleryImages,
  uploadingField,
  coverUploadInputRef,
  galleryUploadInputRef,
  onTriggerPicker,
  onCoverUpload,
  onGalleryUpload,
  onGalleryImageChange,
  onGalleryImageAdd,
  onGalleryImageRemove,
  onGalleryImageMove,
}: ImagesStepProps) {
  const galleryImages = formState.pageData?.galleryImages ?? [];
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);

  useEffect(() => {
    if (galleryImages.length === 0) {
      if (selectedGalleryIndex !== 0) {
        setSelectedGalleryIndex(0);
      }
      return;
    }

    if (selectedGalleryIndex > galleryImages.length - 1) {
      setSelectedGalleryIndex(galleryImages.length - 1);
    }
  }, [galleryImages.length, selectedGalleryIndex]);

  const handleMoveSelectedGalleryImage = (direction: 'up' | 'down') => {
    const nextIndex =
      direction === 'up'
        ? Math.max(0, selectedGalleryIndex - 1)
        : Math.min(galleryImages.length - 1, selectedGalleryIndex + 1);

    if (nextIndex === selectedGalleryIndex) {
      return;
    }

    onGalleryImageMove(selectedGalleryIndex, direction);
    setSelectedGalleryIndex(nextIndex);
  };

  return (
    <div className={styles.fieldGrid}>
      <section className={styles.uploadCard}>
        <div className={styles.uploadHeader}>
          <div>
            <h3 className={styles.cardTitle}>대표 이미지</h3>
            <p className={styles.cardText}>
              첫 화면과 공유 카드에 사용하는 메인 이미지입니다.
            </p>
          </div>
          <div className={styles.inlineActions}>
            <input
              ref={coverUploadInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="image/*"
              onChange={(event) => void onCoverUpload(event)}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onTriggerPicker('cover')}
              disabled={!canUploadImages || uploadingField === 'cover'}
            >
              {uploadingField === 'cover' ? '업로드 중' : '대표 이미지 올리기'}
            </button>
          </div>
        </div>

        <div className={styles.assetPreview}>
          {previewFormState.metadata.images.wedding ? (
            <img
              className={styles.assetPreviewImage}
              src={previewFormState.metadata.images.wedding}
              alt="대표 이미지 미리보기"
              decoding="async"
            />
          ) : (
            <div className={styles.assetPlaceholder}>대표 이미지 미리보기</div>
          )}
        </div>

        <label className={styles.field}>
          {renderFieldMeta('대표 이미지 주소 (이미지 업로드 시 자동 입력)', 'optional')}
          <input
            className={styles.input}
            value={formState.metadata.images.wedding}
            placeholder="https://.../cover.jpg"
            onChange={(event) =>
              updateForm((draft) => {
                draft.metadata.images.wedding = event.target.value;
              })
            }
          />
        </label>
      </section>

      <section className={styles.uploadCard}>
        <div className={styles.uploadHeader}>
          <div>
            <h3 className={styles.cardTitle}>갤러리 이미지</h3>
            <p className={styles.cardText}>
              최대 {maxGalleryImages}장까지 등록할 수 있습니다.
            </p>
          </div>
          <div className={styles.inlineActions}>
            <input
              ref={galleryUploadInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => void onGalleryUpload(event)}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onTriggerPicker('gallery')}
              disabled={
                !canUploadImages ||
                uploadingField === 'gallery' ||
                galleryImages.length >= maxGalleryImages
              }
            >
              {uploadingField === 'gallery' ? '업로드 중' : '갤러리 올리기'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onGalleryImageAdd}
              disabled={galleryImages.length >= maxGalleryImages}
            >
              주소 추가
            </button>
          </div>
        </div>
        {galleryImages.length > 0 ? (
          <div className={styles.gallerySummaryCard}>
            <button
              type="button"
              className={styles.gallerySummaryButton}
              onClick={() => setIsGalleryExpanded((current) => !current)}
              aria-expanded={isGalleryExpanded}
            >
              <div className={styles.gallerySummaryMeta}>
                <strong className={styles.assetItemTitle}>
                  갤러리 이미지 {galleryImages.length}장
                </strong>
                <span className={styles.cardText}>
                  이미지의 순서를 확인하고, 선택한 이미지를 바로 이동할 수 있습니다.
                </span>
              </div>
              <span className={styles.gallerySummaryAction}>
                {isGalleryExpanded ? '간단하게 보기' : '모든 이미지 펼쳐보기'}
              </span>
            </button>

            <div className={styles.gallerySummaryRow}>
              {galleryImages.map((imageUrl, index) => (
                <button
                  key={`gallery-summary-${index}`}
                  type="button"
                  className={`${styles.gallerySummaryItem} ${
                    selectedGalleryIndex === index ? styles.gallerySummaryItemActive : ''
                  }`}
                  onClick={() => setSelectedGalleryIndex(index)}
                  aria-label={`갤러리 이미지 ${index + 1} 선택`}
                  aria-pressed={selectedGalleryIndex === index}
                >
                  {imageUrl ? (
                    <img
                      className={styles.gallerySummaryImage}
                      src={imageUrl}
                      alt={`갤러리 요약 ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className={styles.gallerySummaryPlaceholder}>{index + 1}</div>
                  )}
                  <span className={styles.gallerySummaryIndex}>{index + 1}</span>
                </button>
              ))}
            </div>

            <div className={styles.gallerySummaryToolbar}>
              <span className={styles.gallerySummarySelection}>
                {selectedGalleryIndex + 1}번 이동 중
              </span>
              <div className={styles.gallerySummaryToolbarActions}>
                <button
                  type="button"
                  className={styles.gallerySummaryMoveButton}
                  onClick={() => handleMoveSelectedGalleryImage('up')}
                  disabled={selectedGalleryIndex === 0}
                >
                  앞으로 이동
                </button>
                <button
                  type="button"
                  className={styles.gallerySummaryMoveButton}
                  onClick={() => handleMoveSelectedGalleryImage('down')}
                  disabled={selectedGalleryIndex === galleryImages.length - 1}
                >
                  뒤로 이동
                </button>
              </div>
            </div>

            {isGalleryExpanded ? (
              <div className={styles.assetList}>
                {galleryImages.map((imageUrl, index) => (
                  <article key={`gallery-${index}`} className={styles.assetItem}>
                    {imageUrl ? (
                      <img
                        className={styles.assetItemImage}
                        src={imageUrl}
                        alt={`갤러리 ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className={styles.assetPlaceholder}>이미지 {index + 1}</div>
                    )}
                    <div className={styles.assetItemBody}>
                      <div className={styles.assetItemHeader}>
                        <strong className={styles.assetItemTitle}>
                          갤러리 이미지 {index + 1}
                        </strong>
                        <div className={styles.assetActionRow}>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => onGalleryImageMove(index, 'up')}
                            disabled={index === 0}
                          >
                            위로
                          </button>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => onGalleryImageMove(index, 'down')}
                            disabled={index === galleryImages.length - 1}
                          >
                            아래로
                          </button>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => onGalleryImageRemove(index)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <label className={styles.field}>
                        {renderFieldMeta('이미지 주소 (이미지 업로드 시 자동 입력)', 'optional')}
                        <input
                          className={styles.input}
                          value={imageUrl}
                          placeholder="https://.../gallery-01.jpg"
                          onChange={(event) =>
                            onGalleryImageChange(index, event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className={styles.assetPlaceholder}>
            아직 등록된 갤러리 이미지가 없습니다.
          </div>
        )}
      </section>
    </div>
  );
}
