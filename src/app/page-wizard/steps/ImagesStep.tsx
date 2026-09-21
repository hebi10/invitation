import { useEffect, useMemo, useState } from 'react';

import styles from '../page.module.css';
import type { ImagesStepProps, UploadFieldKind } from '../pageWizardShared';
import DemoExperienceImagePicker from './DemoExperienceImagePicker';
import previewStyles from './ShareImagePreview.module.css';
import imageStyles from './ImagesStep.module.css';

const SHARE_PRESETS = [
  { url: '/images/share-defaults/ivory-flowers.webp', label: '아이보리 꽃' },
  { url: '/images/share-defaults/rings-ribbon.webp', label: '반지와 리본' },
];

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
  fallbackImage?: string;
  shareTitle?: string;
  shareDescription?: string;
  onPresetSelect?: (url: string) => void;
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
  fallbackImage = '',
  shareTitle = '',
  shareDescription = '',
  onPresetSelect,
}: SingleImageCardProps) {
  const hasImage = Boolean(imageUrl);
  const effectiveImage = imageUrl || fallbackImage;
  const isShare = uploadKind === 'sharePreview' || uploadKind === 'kakaoCard';
  const [failedUrl, setFailedUrl] = useState('');
  const [presetSelection, setPresetSelection] = useState<{ previous: string; selected: string } | null>(null);
  const isPresetSelected = SHARE_PRESETS.some(preset => preset.url === imageUrl);
  const previousImage = presetSelection?.selected === imageUrl ? presetSelection.previous : '';
  const previewImage = effectiveImage && failedUrl !== effectiveImage ? effectiveImage : '';

  const cancelPreset = () => {
    onPresetSelect?.(previousImage);
    setPresetSelection(null);
  };

  const selectPreset = (url: string) => {
    if (url === imageUrl) {
      cancelPreset();
      return;
    }
    setPresetSelection({
      previous: presetSelection?.selected === imageUrl
        ? presetSelection.previous
        : isPresetSelected ? '' : imageUrl,
      selected: url,
    });
    onPresetSelect?.(url);
  };

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
            onClick={() => { setPresetSelection(null); onRemove(); }}
            disabled={!hasImage || isUploading}
          >
            {isPresetSelected ? '기본 이미지 제거' : removeLabel}
          </button>
        </div>
      </div>

      {isShare ? <div className={previewStyles.preview}>
        <p className={previewStyles.caption}>{uploadKind === 'kakaoCard' ? '카카오 공유 카드 예시' : '링크를 보냈을 때의 예시'}</p>
        <div className={previewStyles.card}>
          {previewImage ? <img className={previewStyles.image} src={previewImage} alt={`${title} 실제 적용 이미지`} onError={() => setFailedUrl(effectiveImage)} />
            : <div className={previewStyles.empty}>{effectiveImage ? '이미지를 불러오지 못했습니다. 다시 업로드하거나 기본 이미지를 선택해 주세요.' : '대표 이미지를 등록하거나 아래 기본 이미지를 선택해 주세요.'}</div>}
          <div className={previewStyles.copy}><strong>{shareTitle || '초대합니다'}</strong><p>{shareDescription || '소중한 날 함께해 주세요.'}</p><span>초대장 링크</span></div>
          {uploadKind === 'kakaoCard' ? <div className={previewStyles.cardAction}>초대장 보기</div> : null}
        </div>
        <p className={previewStyles.caption}>{hasImage ? (SHARE_PRESETS.some(item => item.url === imageUrl) ? '선택한 기본 이미지 사용 중' : '등록한 이미지 사용 중') : fallbackImage ? '별도 이미지 미등록 · 아래 안내 순서에 따라 자동 적용 중' : '적용할 이미지가 없습니다.'}</p>
      </div> : <div className={styles.assetPreview}>
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
      </div>}

      {isShare && onPresetSelect ? <fieldset className={previewStyles.presets}>
        <legend>기본 이미지 선택</legend>
        {SHARE_PRESETS.map(preset => <button key={preset.url} type="button" aria-pressed={imageUrl === preset.url} disabled={isUploading || !canUploadImages} onClick={() => selectPreset(preset.url)}>
          <img src={preset.url} alt="" loading="lazy" /><span>{preset.label}{imageUrl === preset.url ? ' · 선택됨' : ''}</span>
        </button>)}
        {isPresetSelected ? <button type="button" disabled={isUploading || !canUploadImages} onClick={cancelPreset}>기본 이미지 선택 취소</button> : null}
        {isPresetSelected ? <p>{previousImage ? '취소하면 이번 화면에서 선택하기 전의 이미지로 돌아갑니다.' : '취소하면 별도 이미지 없이 아래 안내 순서로 자동 적용됩니다.'} 선택한 이미지를 다시 눌러도 취소할 수 있습니다.</p> : null}
        <p>직접 올릴 사진이 없을 때 선택하세요. 내용 저장 후 실제 공유 이미지에 반영됩니다.</p>
      </fieldset> : null}

      <p className={styles.cardText}>{emptyHint}</p>
      {isShare ? <p className={previewStyles.caption}>보내는 앱에 따라 사진의 잘리는 범위와 문구 배치가 달라질 수 있습니다. 얼굴과 중요한 내용은 중앙에 배치해 주세요.</p> : null}
    </section>
  );
}

export default function ImagesStep({
  formState,
  updateForm,
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
  experience = false,
  onDemoImageSelect,
  mode = 'all',
}: ImagesStepProps & { mode?: 'all' | 'photos' | 'sharing' }) {
  const galleryImages = useMemo(
    () => formState.pageData?.galleryImages ?? [],
    [formState.pageData?.galleryImages]
  );
  const coverImage = previewFormState.metadata.images.wedding?.trim() ?? '';
  const socialPreviewImage = previewFormState.metadata.images.social?.trim() ?? '';
  const kakaoCardImage = previewFormState.metadata.images.kakaoCard?.trim() ?? '';
  const isFirstBirthday = formState.eventType === 'first-birthday';
  const isGeneralEvent = formState.eventType === 'general-event';

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
      {mode !== 'sharing' && experience && onDemoImageSelect ? (
        <DemoExperienceImagePicker
          selectedImage={coverImage}
          onSelect={onDemoImageSelect}
        />
      ) : null}
      {mode !== 'sharing' ? <SingleImageCard
        title="대표 이미지"
        description={
          isGeneralEvent
            ? '행사 초대장 최상단과 공유 화면에 사용하는 메인 이미지입니다.'
            : isFirstBirthday
            ? '돌잔치 초대장 최상단과 첫 화면에 사용하는 메인 이미지입니다.'
            : '청첩장 최상단과 첫 화면에 사용하는 메인 이미지입니다.'
        }
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
      /> : null}

      {mode !== 'sharing' ? <section className={styles.uploadCard}>
        <div className={styles.uploadHeader}>
          <div>
            <h3 className={styles.cardTitle}>
              {isFirstBirthday ? '성장 갤러리 이미지' : '갤러리 이미지'}
            </h3>
            <p className={styles.cardText}>
              {galleryImages.length} / {maxGalleryImages}장 · 여러 사진을 한 번에 선택할 수 있습니다.
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
          <div className={imageStyles.gallery}>
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
                {isGalleryExpanded ? '사진 상세 닫기' : '사진 상세 보기'}
              </span>
            </button>

            <div className={imageStyles.galleryGrid} role="group" aria-label="갤러리 사진 순서">
              {galleryImages.map((imageUrl, index) => (
                <button
                  key={`gallery-summary-${index}`}
                  type="button"
                  className={imageStyles.galleryPhoto}
                  onClick={() => setSelectedGalleryIndex(index)}
                  aria-label={`갤러리 이미지 ${index + 1} 선택`}
                  aria-pressed={selectedGalleryIndex === index}
                >
                  {imageUrl && !brokenGalleryIndexes[index] ? (
                    <img
                      className={imageStyles.galleryImage}
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={() => handleGalleryImageError(index)}
                    />
                  ) : (
                    <div className={imageStyles.galleryPlaceholder}>사진 확인 필요</div>
                  )}
                  <span className={imageStyles.galleryCaption}>{index + 1}번{selectedGalleryIndex === index ? ' · 선택됨' : ''}</span>
                </button>
              ))}
            </div>

            <div className={imageStyles.galleryToolbar}>
              <span className={imageStyles.selectionStatus} role="status" aria-live="polite">
                {selectedGalleryIndex + 1}번 이미지 선택 중
              </span>
              <div className={imageStyles.galleryActions}>
                <button
                  type="button"
                  className={imageStyles.galleryAction}
                  onClick={() => handleMoveSelectedGalleryImage('up')}
                  disabled={selectedGalleryIndex === 0}
                >
                  앞으로 이동
                </button>
                <button
                  type="button"
                  className={imageStyles.galleryAction}
                  onClick={() => handleMoveSelectedGalleryImage('down')}
                  disabled={selectedGalleryIndex === galleryImages.length - 1}
                >
                  뒤로 이동
                </button>
                <button
                  type="button"
                  className={imageStyles.galleryAction}
                  onClick={() => onGalleryImageRemove(selectedGalleryIndex)}
                >
                  선택 사진 제거
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
            함께 보여주고 싶은 사진을 ‘갤러리 올리기’에서 선택해 주세요.
          </div>
        )}
      </section> : null}

      {mode !== 'photos' ? <SingleImageCard
        title="공유 미리보기 이미지"
        description="카카오톡이나 SNS에 초대장 링크를 붙여넣었을 때 보이는 사진입니다."
        imageUrl={socialPreviewImage}
        fallbackImage={coverImage}
        shareTitle={formState.metadata.title || formState.displayName}
        shareDescription={formState.metadata.description || formState.description}
        onPresetSelect={formState.eventType === 'wedding' ? url => updateForm(draft => { draft.metadata.images.social = url; }) : undefined}
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
      /> : null}

      {mode !== 'photos' ? <SingleImageCard
        title="카카오 카드 이미지"
        description="청첩장의 카카오톡 공유 버튼을 눌렀을 때 보내는 카드 사진입니다."
        imageUrl={kakaoCardImage}
        fallbackImage={socialPreviewImage || coverImage}
        shareTitle={formState.metadata.title || formState.displayName}
        shareDescription={formState.metadata.description || formState.description || [formState.date, formState.venue].filter(Boolean).join(' · ')}
        onPresetSelect={formState.eventType === 'wedding' ? url => updateForm(draft => { draft.metadata.images.kakaoCard = url; }) : undefined}
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
      /> : null}
    </div>
  );
}
