'use client';

import { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, EffectCreative, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-creative';
import styles from './WeddingGallerySwiper.module.css';

export type WeddingGalleryVariant = 'simple' | 'romantic' | 'emotional' | 'classic-r' | 'gyeol';

interface Props {
  images: string[];
  previewImages?: string[];
  variant: WeddingGalleryVariant;
  reducedMotion: boolean;
  altPrefix: string;
  onOpen: (index: number, trigger: HTMLButtonElement) => void;
}

export default function WeddingGallerySwiper({ images, previewImages, variant, reducedMotion, altPrefix, onOpen }: Props) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [index, setIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const count = images.length;
  const activeIndex = Math.min(index, Math.max(0, count - 1));
  const strip = variant === 'simple' || variant === 'classic-r';
  const effect = reducedMotion ? 'slide' : variant === 'romantic' ? 'fade' : strip ? 'slide' : 'creative';
  const move = (direction: -1 | 1) => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) return;
    if (direction === 1) swiper.slideNext();
    else swiper.slidePrev();
  };

  return <div className={styles.gallery} data-gallery-variant={variant}
    onKeyDown={(event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
      event.currentTarget.querySelector<HTMLElement>('.swiper')?.focus();
    }}
  >
    <Swiper
      key={`${variant}-${reducedMotion}-${images.join('|')}`}
      className={styles.track}
      modules={[A11y, EffectCreative, EffectFade]}
      effect={effect}
      speed={reducedMotion ? 0 : variant === 'romantic' ? 750 : 600}
      slidesPerView={count > 1 && strip ? variant === 'classic-r' ? 1.35 : 1.14 : 1}
      centeredSlides={strip}
      spaceBetween={strip ? 16 : 0}
      grabCursor={count > 1}
      allowTouchMove={count > 1}
      watchOverflow
      watchSlidesProgress
      fadeEffect={{ crossFade: true }}
      creativeEffect={variant === 'emotional' ? {
        perspective: false,
        prev: { translate: ['-12%', 0, 0], rotate: [0, 0, -4], scale: .9, opacity: 0 },
        next: { translate: ['100%', 0, 0], rotate: [0, 0, 4], scale: .96, opacity: 1 },
      } : {
        perspective: false,
        prev: { translate: [0, '-8%', 0], opacity: 0, scale: .98 },
        next: { translate: [0, '12%', 0], opacity: 0, scale: 1 },
      }}
      a11y={{ containerMessage: `${altPrefix} 슬라이드`, slideLabelMessage: '{{index}} / {{slidesLength}}', itemRoleDescriptionMessage: '사진' }}
      onSwiper={(swiper) => { swiperRef.current = swiper; setIndex(swiper.activeIndex); }}
      onSlideChange={(swiper) => setIndex(swiper.activeIndex)}
      tabIndex={0}
    >
      {images.map((image, imageIndex) => {
        const src = previewImages?.[imageIndex] || image;
        return <SwiperSlide key={`${image}-${imageIndex}`} className={styles.slide}>
          {({ isActive }) => <button
            type="button"
            className={styles.photoButton}
            tabIndex={isActive ? 0 : -1}
            aria-hidden={!isActive}
            aria-label={`${altPrefix} ${imageIndex + 1}번째 사진 크게 보기`}
            onClick={(event) => onOpen(imageIndex, event.currentTarget)}
          >
            {failedImages.has(src) ? <span className={styles.error}>사진을 불러오지 못했습니다.<br />눌러서 원본 보기</span> : <img
              className={styles.photo}
              src={src}
              alt={`${altPrefix} ${imageIndex + 1}번째 사진`}
              loading="lazy"
              decoding="async"
              onError={() => setFailedImages((current) => new Set([...current, src]))}
            />}
          </button>}
        </SwiperSlide>;
      })}
    </Swiper>
    {count > 1 ? <>
      <div className={styles.controls}>
        <button type="button" disabled={activeIndex === 0} onClick={() => move(-1)}>이전 사진</button>
        <span aria-live="polite" aria-atomic="true" aria-label={`${count}장 중 ${activeIndex + 1}번째 사진`}>{String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
        <button type="button" disabled={activeIndex === count - 1} onClick={() => move(1)}>다음 사진</button>
      </div>
      <div className={styles.progress} aria-hidden="true"><span style={{ width: `${((activeIndex + 1) / count) * 100}%` }} /></div>
      <p className={styles.hint}>옆으로 넘겨 보세요 · 사진을 누르면 크게 볼 수 있어요</p>
    </> : null}
  </div>;
}
