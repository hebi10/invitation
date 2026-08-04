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
  renderHero: (styles: Record<string, string>) => ReactNode;
  renderHeading: (args: {
    styles: Record<string, string>;
    groomName: string;
    brideName: string;
  }) => ReactNode;
  renderSubtitle: (styles: Record<string, string>) => ReactNode;
  messageClassName: string;
}

const EMPTY_PRELOAD_IMAGES: string[] = [];

function preloadSingleImage(
  imageUrl: string,
  options: {
    waitForDecode?: boolean;
  } = {}
) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    const finalizeLoad = () => {
      if (!options.waitForDecode || typeof image.decode !== 'function') {
        finish();
        return;
      }

      void image
        .decode()
        .catch(() => undefined)
        .then(finish);
    };

    image.decoding = options.waitForDecode ? 'sync' : 'async';
    image.onload = finalizeLoad;
    image.onerror = finish;
    image.src = imageUrl;

    if (image.complete) {
      finalizeLoad();
    }
  });
}

export default function WeddingLoaderMessage({
  brideName,
  groomName,
  onLoadComplete,
  duration = 3000,
  preloadImages = EMPTY_PRELOAD_IMAGES,
  mainImage,
  styles,
  loadingMessages,
  renderHero,
  renderHeading,
  renderSubtitle,
  messageClassName,
}: WeddingLoaderMessageProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let readinessTimeoutId: number | undefined;
    const criticalImages = Array.from(
      new Set([mainImage, preloadImages[0]].filter(Boolean) as string[])
    );
    const deferredImages = preloadImages
      .filter((imageUrl) => imageUrl && !criticalImages.includes(imageUrl))
      .slice(0, 1);

    setImagesLoaded(false);

    if (criticalImages.length === 0) {
      setImagesLoaded(true);
      return;
    }

    const imageReadiness = Promise.all(
      criticalImages.map((imageUrl) =>
        preloadSingleImage(imageUrl, { waitForDecode: true })
      )
    );
    const readinessTimeout = new Promise<void>((resolve) => {
      readinessTimeoutId = window.setTimeout(resolve, duration);
    });

    void Promise.race([imageReadiness, readinessTimeout]).then(() => {
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
      if (readinessTimeoutId !== undefined) {
        window.clearTimeout(readinessTimeoutId);
      }
    };
  }, [duration, mainImage, preloadImages]);

  useEffect(() => {
    if (imagesLoaded) {
      onLoadComplete();
      return;
    }

    const messageInterval = window.setInterval(() => {
      setCurrentMessage((previous) => (previous + 1) % loadingMessages.length);
    }, Math.max(duration / 4, 800));

    return () => {
      window.clearInterval(messageInterval);
    };
  }, [duration, imagesLoaded, loadingMessages.length, onLoadComplete]);

  return (
    <div className={styles.loaderContainer} role="status" aria-live="polite">
      {renderHero(styles)}
      {renderHeading({ styles, groomName, brideName })}
      {renderSubtitle(styles)}

      <div className={styles.progressContainer} aria-hidden="true">
        <div
          className={styles.progressBar}
          style={{ transform: `scaleX(${imagesLoaded ? 1 : 0.35})` }}
        />
      </div>

      <p className={messageClassName}>{loadingMessages[currentMessage]}</p>
    </div>
  );
}
