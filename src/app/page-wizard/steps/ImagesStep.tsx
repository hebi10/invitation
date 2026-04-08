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
            />
          ) : (
            <div className={styles.assetPlaceholder}>대표 이미지 미리보기</div>
          )}
        </div>

        <label className={styles.field}>
          {renderFieldMeta('대표 이미지 주소 (이미지 업로드시 자동 입력)', 'optional')}
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
            <p className={`${styles.cardText}`}>
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
          <div className={styles.assetList}>
            {galleryImages.map((imageUrl, index) => (
              <article key={`gallery-${index}`} className={styles.assetItem}>
                {imageUrl ? (
                  <img
                    className={styles.assetItemImage}
                    src={imageUrl}
                    alt={`갤러리 ${index + 1}`}
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
                    {renderFieldMeta('이미지 주소 (이미지 업로드시 자동 입력)', 'optional')}
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
        ) : (
          <div className={styles.assetPlaceholder}>
            아직 등록된 갤러리 이미지가 없습니다.
          </div>
        )}
      </section>
    </div>
  );
}
