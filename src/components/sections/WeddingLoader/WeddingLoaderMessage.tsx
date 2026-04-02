'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

export interface WeddingLoaderMessageBaseProps {
  brideName: string;
  groomName: string;
  onLoadComplete: () => void;
  duration?: number;
  preloadImages?: string[];
  mainImage?: string;
}

interface WeddingLoaderMessageProps extends WeddingLoaderMessageBaseProps {
  styles: Record<string, string>;
  loadingMessages: string[];
  minLoadTime: number;
  renderHero: (styles: Record<string, string>) => ReactNode;
  renderHeading: (args: {
    styles: Record<string, string>;
    groomName: string;
    brideName: string;
  }) => ReactNode;
  renderSubtitle: (styles: Record<string, string>) => ReactNode;
  messageClassName: string;
}

function preloadSingleImage(imageUrl: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = imageUrl;
  });
}

export default function WeddingLoaderMessage({
  brideName,
  groomName,
  onLoadComplete,
  duration = 3000,
  preloadImages = [],
  mainImage,
  styles,
  loadingMessages,
  minLoadTime,
  renderHero,
  renderHeading,
  renderSubtitle,
  messageClassName,
}: WeddingLoaderMessageProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const criticalImages = [mainImage || preloadImages[0]].filter(Boolean) as string[];
    const deferredImages = preloadImages
      .filter((imageUrl) => imageUrl && imageUrl !== mainImage)
      .slice(0, 1);

    if (criticalImages.length === 0) {
      setImagesLoaded(true);
      return;
    }

    void Promise.all(criticalImages.map(preloadSingleImage)).then(() => {
      if (!cancelled) {
        setImagesLoaded(true);
      }
    });

    if (deferredImages.length > 0 && typeof window !== 'undefined') {
      const preloadDeferredImages = () => {
        deferredImages.forEach((imageUrl) => {
          void preloadSingleImage(imageUrl);
        });
      };

      if ('requestIdleCallback' in window) {
        (
          window as Window & {
            requestIdleCallback: (callback: () => void) => number;
          }
        ).requestIdleCallback(preloadDeferredImages);
      } else {
        globalThis.setTimeout(preloadDeferredImages, 400);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [mainImage, preloadImages]);

  useEffect(() => {
    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const targetDuration = imagesLoaded ? minLoadTime : duration;
      const timeProgress = Math.min((elapsed / targetDuration) * 100, 100);

      setProgress((previous) => Math.max(previous, timeProgress));

      if (elapsed >= minLoadTime) {
        setMinTimeElapsed(true);
      }

      if (imagesLoaded && minTimeElapsed && timeProgress >= 100) {
        window.clearInterval(progressInterval);
        window.setTimeout(onLoadComplete, 180);
      }
    }, 60);

    const messageInterval = window.setInterval(() => {
      setCurrentMessage((previous) => (previous + 1) % loadingMessages.length);
    }, Math.max(duration / 4, 800));

    return () => {
      window.clearInterval(progressInterval);
      window.clearInterval(messageInterval);
    };
  }, [
    duration,
    imagesLoaded,
    loadingMessages.length,
    minLoadTime,
    minTimeElapsed,
    onLoadComplete,
    startTime,
  ]);

  return (
    <div className={styles.loaderContainer}>
      {renderHero(styles)}
      {renderHeading({ styles, groomName, brideName })}
      {renderSubtitle(styles)}

      <div className={styles.progressContainer}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      <p className={messageClassName}>{loadingMessages[currentMessage]}</p>
    </div>
  );
}
