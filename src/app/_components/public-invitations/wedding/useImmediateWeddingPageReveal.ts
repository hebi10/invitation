'use client';

import { useEffect } from 'react';

import type { WeddingPageReadyState } from '../../weddingPageState';

type ImmediateWeddingPageRevealState = Pick<
  WeddingPageReadyState,
  'imagesLoading' | 'isLoading' | 'setIsLoading'
>;

export function useImmediateWeddingPageReveal({
  imagesLoading,
  isLoading,
  setIsLoading,
}: ImmediateWeddingPageRevealState) {
  useEffect(() => {
    setIsLoading(false);

    const releasePageOverflow = () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    };

    releasePageOverflow();
    const frame = window.requestAnimationFrame(releasePageOverflow);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [imagesLoading, isLoading, setIsLoading]);
}
