/**
 * Firebase Storage image helpers.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export function optimizeImageUrl(
  url: string,
  _options: ImageOptimizationOptions = {}
): string {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  try {
    void new URL(url);
    return url;
  } catch (error) {
    console.warn('URL 최적화 실패:', error);
    return url;
  }
}

export function preloadImage(
  url: string,
  priority: 'high' | 'low' = 'high'
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve();
      return;
    }

    const img = new Image();

    if ('fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority: 'high' | 'low' }).fetchPriority =
        priority;
    }

    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

export async function preloadImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter((url) => url && url.trim() !== '');

  if (validUrls.length === 0) {
    return;
  }

  try {
    const promises = validUrls.map((url, index) =>
      preloadImage(url, index < 3 ? 'high' : 'low').catch((error) => {
        console.warn('이미지 프리로드 실패:', url, error);
      })
    );

    await Promise.allSettled(promises);
  } catch (error) {
    console.warn('이미지 프리로드 중 오류:', error);
  }
}

export class ImageLoadTracker {
  private loadedImages = new Set<string>();

  private loadingImages = new Map<string, Promise<void>>();

  async load(url: string): Promise<void> {
    if (this.loadedImages.has(url)) {
      return Promise.resolve();
    }

    if (this.loadingImages.has(url)) {
      return this.loadingImages.get(url)!;
    }

    const promise = preloadImage(url)
      .then(() => {
        this.loadedImages.add(url);
        this.loadingImages.delete(url);
      })
      .catch((error) => {
        this.loadingImages.delete(url);
        throw error;
      });

    this.loadingImages.set(url, promise);
    return promise;
  }

  isLoaded(url: string): boolean {
    return this.loadedImages.has(url);
  }

  reset(): void {
    this.loadedImages.clear();
    this.loadingImages.clear();
  }
}

export const imageLoadTracker = new ImageLoadTracker();
