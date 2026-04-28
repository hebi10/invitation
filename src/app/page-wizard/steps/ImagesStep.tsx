import { useEffect, useMemo, useState } from 'react';

import styles from '../page.module.css';
import type { ImagesStepProps, UploadFieldKind } from '../pageWizardShared';

type SingleImageCardProps = {
  title: string;
  description: string;
  imageUrl: string;
  isBroken: boolean;
  placeholder: string;
  emptyHint: string;
  removeLabel: string;
  uploadLabel: string;
  uploadKind: Exclude<UploadFieldKind, 'gallery'>;
  isUploading: boolean;
  canUploadImages: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: React.ChangeEventHandler<HTMLInputElement>;
  onTriggerPicker: (kind: UploadFieldKind) => void;
  onRemove: () => void;
  onImageError: () => void;
};

function SingleImageCard({
  title,
  description,
  imageUrl,
  isBroken,
  placeholder,
  emptyHint,
  removeLabel,
  uploadLabel,
  uploadKind,
  isUploading,
  canUploadImages,
  inputRef,
  onUpload,
  onTriggerPicker,
  onRemove,
  onImageError,
}: SingleImageCardProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <section className={styles.uploadCard}>
      <div className={styles.uploadHeader}>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.cardText}>{description}</p>
        </div>
        <div className={styles.inlineActions}>
          <input
            ref={inputRef}
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            onChange={onUpload}
          />
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onTriggerPicker(uploadKind)}
            disabled={!canUploadImages || isUploading}
          >
            {isUploading ? '업로드 중' : uploadLabel}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onRemove}
            disabled={!hasImage}
          >
            {removeLabel}
          </button>
        </div>
      </div>

      <div className={styles.assetPreview}>
        {hasImage && !isBroken ? (
          <img
            className={styles.assetPreviewImage}
            src={imageUrl}
            alt={`${title} 미리보기`}
            decoding="async"
            onError={onImageError}
          />
        ) : (
          <div className={styles.assetPlaceholder}>
            {hasImage ? `${title}를 불러오지 못했습니다.` : placeholder}
          </div>
        )}
      </div>

      <p className={styles.cardText}>{emptyHint}</p>
    </section>
  );
}

export default function ImagesStep({
  formState,
  previewFormState,
  canUploadImages,
  maxGalleryImages,
  uploadingField,
  coverUploadInputRef,
  sharePreviewUploadInputRef,
  kakaoCardUploadInputRef,
  galleryUploadInputRef,
  onTriggerPicker,
  onCoverUpload,
  onSharePreviewUpload,
  onKakaoCardUpload,
  onGalleryUpload,
  onCoverImageRemove,
  onSharePreviewImageRemove,
  onKakaoCardImageRemove,
  onGalleryImageRemove,
  onGalleryImageMove,
}: ImagesStepProps) {
  const galleryImages = useMemo(
    () => formState.pageData?.galleryImages ?? [],
    [formState.pageData?.galleryImages]
  );
  const coverImage = previewFormState.metadata.images.wedding?.trim() ?? '';
  const socialPreviewImage = previewFormState.metadata.images.social?.trim() ?? '';
  const kakaoCardImage = previewFormState.metadata.images.kakaoCard?.trim() ?? '';

  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [brokenSingleImages, setBrokenSingleImages] = useState<
    Record<'cover' | 'sharePreview' | 'kakaoCard', boolean>
  >({
    cover: false,
    sharePreview: false,
    kakaoCard: false,
  });
  const [brokenGalleryIndexes, setBrokenGalleryIndexes] = useState<Record<number, boolean>>({});

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

  useEffect(() => {
    setBrokenSingleImages({
      cover: false,
      sharePreview: false,
      kakaoCard: false,
    });
  }, [coverImage, kakaoCardImage, socialPreviewImage]);

  useEffect(() => {
    setBrokenGalleryIndexes({});
  }, [galleryImages]);

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

  const handleGalleryImageError = (index: number) => {
    setBrokenGalleryIndexes((current) => ({ ...current, [index]: true }));
  };

  const markSingleImageAsBroken = (kind: 'cover' | 'sharePreview' | 'kakaoCard') => {
    setBrokenSingleImages((current) => ({ ...current, [kind]: true }));
  };

  return (
    <div className={styles.fieldGrid}>
      <SingleImageCard
        title="대표 이미지"
        description="청첩장 최상단과 첫 화면에 사용하는 메인 이미지입니다."
        imageUrl={coverImage}
        isBroken={brokenSingleImages.cover}
        placeholder="대표 이미지 미리보기"
        emptyHint="대표 이미지를 등록하지 않으면 첫 화면 이미지가 비어 보일 수 있습니다."
        removeLabel="대표 이미지 제거"
        uploadLabel="대표 이미지 올리기"
        uploadKind="cover"
        isUploading={uploadingField === 'cover'}
        canUploadImages={canUploadImages}
        inputRef={coverUploadInputRef}
        onUpload={(event) => void onCoverUpload(event)}
        onTriggerPicker={onTriggerPicker}
        onRemove={onCoverImageRemove}
        onImageError={() => markSingleImageAsBroken('cover')}
      />

      <SingleImageCard
        title="공유 미리보기 이미지"
        description="카카오 링크 미리보기와 og:image, twitter:image에 사용하는 이미지입니다."
        imageUrl={socialPreviewImage}
        isBroken={brokenSingleImages.sharePreview}
        placeholder="공유 미리보기 이미지 미리보기"
        emptyHint="등록하지 않으면 대표 이미지를 공유 미리보기 이미지로 사용합니다."
        removeLabel="공유 미리보기 제거"
        uploadLabel="공유 이미지 올리기"
        uploadKind="sharePreview"
        isUploading={uploadingField === 'sharePreview'}
        canUploadImages={canUploadImages}
        inputRef={sharePreviewUploadInputRef}
        onUpload={(event) => void onSharePreviewUpload(event)}
        onTriggerPicker={onTriggerPicker}
        onRemove={onSharePreviewImageRemove}
        onImageError={() => markSingleImageAsBroken('sharePreview')}
      />

      <SingleImageCard
        title="카카오 카드 이미지"
        description="카카오 카드 형식 공유(feed)에 사용하는 전용 이미지입니다."
        imageUrl={kakaoCardImage}
        isBroken={brokenSingleImages.kakaoCard}
        placeholder="카카오 카드 이미지 미리보기"
        emptyHint="등록하지 않으면 공유 미리보기 이미지, 그다음 대표 이미지 순서로 사용합니다."
        removeLabel="카카오 카드 제거"
        uploadLabel="카카오 카드 올리기"
        uploadKind="kakaoCard"
        isUploading={uploadingField === 'kakaoCard'}
        canUploadImages={canUploadImages}
        inputRef={kakaoCardUploadInputRef}
        onUpload={(event) => void onKakaoCardUpload(event)}
        onTriggerPicker={onTriggerPicker}
        onRemove={onKakaoCardImageRemove}
        onImageError={() => markSingleImageAsBroken('kakaoCard')}
      />

      <section className={styles.uploadCard}>
        <div className={styles.uploadHeader}>
          <div>
            <h3 className={styles.cardTitle}>갤러리 이미지</h3>
            <p className={styles.cardText}>
              최대 {maxGalleryImages}장까지 업로드할 수 있습니다.
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
                <strong className={styles.assetItemTitle}>갤러리 이미지 {galleryImages.length}장</strong>
                <span className={styles.cardText}>
                  이미지 순서를 확인하고 선택한 이미지를 바로 이동할 수 있습니다.
                </span>
              </div>
              <span className={styles.gallerySummaryAction}>
                {isGalleryExpanded ? '간단하게 보기' : '모든 이미지 전체보기'}
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
                  {imageUrl && !brokenGalleryIndexes[index] ? (
                    <img
                      className={styles.gallerySummaryImage}
                      src={imageUrl}
                      alt={`갤러리 요약 ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      onError={() => handleGalleryImageError(index)}
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
                {selectedGalleryIndex + 1}번 이미지 선택 중
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
                    {imageUrl && !brokenGalleryIndexes[index] ? (
                      <img
                        className={styles.assetItemImage}
                        src={imageUrl}
                        alt={`갤러리 ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        onError={() => handleGalleryImageError(index)}
                      />
                    ) : (
                      <div className={styles.assetPlaceholder}>이미지 {index + 1}</div>
                    )}
                    <div className={styles.assetItemBody}>
                      <div className={styles.assetItemHeader}>
                        <strong className={styles.assetItemTitle}>갤러리 이미지 {index + 1}</strong>
                        <div className={styles.assetActionRow}>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => onGalleryImageMove(index, 'up')}
                            disabled={index === 0}
                          >
                            앞으로
                          </button>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => onGalleryImageMove(index, 'down')}
                            disabled={index === galleryImages.length - 1}
                          >
                            뒤로
                          </button>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => onGalleryImageRemove(index)}
                          >
                            제거
                          </button>
                        </div>
                      </div>
                      <p className={styles.cardText}>
                        업로드한 이미지만 표시합니다. 잘못 올라간 이미지는 제거 후 다시 업로드하세요.
                      </p>
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
