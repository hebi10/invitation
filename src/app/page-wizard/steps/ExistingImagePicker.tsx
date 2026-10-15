import { useEffect, useId, useRef, useState } from 'react';

import { getImagesByPage, type UploadedImage } from '@/services/imageService';

import styles from '../page.module.css';
import imageStyles from './ImagesStep.module.css';

interface ExistingImagePickerProps {
  pageSlug: string;
  title: string;
  selectedUrls: string[];
  disabled: boolean;
  selectionLimitReached?: boolean;
  onSelect: (imageUrl: string) => void;
}

export default function ExistingImagePicker({
  pageSlug,
  title,
  selectedUrls,
  disabled,
  selectionLimitReached = false,
  onSelect,
}: ExistingImagePickerProps) {
  const panelId = useId();
  const requestId = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => () => { requestId.current += 1; }, []);

  const loadImages = async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError('');
    try {
      const nextImages = await getImagesByPage(pageSlug, { forceRefresh: true });
      if (currentRequest === requestId.current) setImages(nextImages);
    } catch {
      if (currentRequest === requestId.current) {
        setError('사진 목록을 불러오지 못했습니다. 로그인 상태와 연결을 확인하고 다시 불러와 주세요.');
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  };

  const toggleLibrary = async () => {
    if (isOpen) {
      requestId.current += 1;
      setIsLoading(false);
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    await loadImages();
  };

  return <div className={imageStyles.library}>
    <button type="button" className={styles.secondaryButton} disabled={disabled}
      aria-expanded={isOpen} aria-controls={panelId} onClick={toggleLibrary}>
      {isOpen ? '기존 사진 목록 닫기' : '기존 사진에서 선택'}
    </button>
    {isOpen ? <div id={panelId} className={imageStyles.libraryPanel} aria-label={`${title} 기존 사진`}>
      <div className={styles.inlineActions}>
        <p className={styles.cardText}>이 초대장에 업로드된 사진입니다. 선택 후 내용을 저장하면 반영됩니다.</p>
        <button type="button" className={styles.secondaryButton} disabled={disabled || isLoading}
          onClick={loadImages}>{error ? '다시 불러오기' : '목록 새로고침'}</button>
      </div>
      {isLoading ? <p className={styles.cardText} role="status">사진 목록을 불러오는 중입니다.</p>
        : error ? <p className={styles.cardText} role="alert">{error}</p>
        : images.length === 0 ? <p className={styles.cardText} role="status">업로드된 사진이 없습니다. 위의 이미지 올리기에서 사진을 추가해 주세요.</p>
        : <div className={imageStyles.libraryGrid} role="group" aria-label={`${title}에 사용할 사진 선택`}>
          {images.map(image => {
            const selected = selectedUrls.includes(image.url);
            return <button key={image.path} type="button" className={imageStyles.galleryPhoto}
              aria-label={`${image.name} · ${selected ? '선택됨' : `${title}에 사용`}`}
              aria-pressed={selected} disabled={disabled || selected || selectionLimitReached}
              onClick={() => { if (!disabled && !selected && !selectionLimitReached) onSelect(image.url); }}>
              <img className={imageStyles.galleryImage} src={image.thumbnailUrl || image.url} alt="" loading="lazy" decoding="async" />
              <span className={`${imageStyles.galleryCaption} ${imageStyles.libraryCaption}`}>{image.name}</span>
              <span className={imageStyles.galleryCaption}>{selected ? '선택됨' : '이 사진 사용'}</span>
            </button>;
          })}
        </div>}
      {selectionLimitReached ? <p className={styles.cardText} role="status">갤러리 사진이 최대 장수에 도달했습니다. 기존 사진을 제거한 뒤 선택해 주세요.</p> : null}
    </div> : null}
  </div>;
}
