/**
 * Firebase Storage 이미지 URL에 크기 최적화 파라미터 추가
 * 참고: Firebase Storage는 자동으로 이미지 크기를 조정하지 않으므로
 * 클라이언트 측에서 적절한 크기로 표시하는 것이 중요합니다.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Firebase Storage URL에 이미지 변환 파라미터 추가
 * (Firebase Storage의 Image Transformation API 사용)
 */
export function optimizeImageUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return url;

  // Firebase Storage URL인지 확인
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    
    // 이미지 변환 파라미터 추가
    // Firebase Storage는 기본적으로 이미지 변환을 지원하지 않으므로
    // 원본 URL을 그대로 반환하고 Next.js Image 컴포넌트가 처리하도록 함
    return url;
  } catch (error) {
    console.warn('URL 최적화 실패:', error);
    return url;
  }
}

/**
 * 이미지 프리로드 함수
 */
export function preloadImage(url: string, priority: 'high' | 'low' = 'high'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve();
      return;
    }

    const img = new Image();
    
    // 우선순위 설정 (브라우저가 지원하는 경우)
    if ('fetchPriority' in img) {
      (img as any).fetchPriority = priority;
    }
    
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * 여러 이미지를 동시에 프리로드
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter(url => url && url.trim() !== '');
  
  if (validUrls.length === 0) {
    return;
  }

  try {
    // 처음 3개는 high priority, 나머지는 low priority
    const promises = validUrls.map((url, index) => 
      preloadImage(url, index < 3 ? 'high' : 'low').catch(err => {
        console.warn('이미지 프리로드 실패:', url, err);
      })
    );
    
    await Promise.allSettled(promises);
  } catch (error) {
    console.warn('이미지 프리로드 중 오류:', error);
  }
}

/**
 * 이미지 로딩 상태를 추적하는 클래스
 */
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

    const promise = preloadImage(url).then(() => {
      this.loadedImages.add(url);
      this.loadingImages.delete(url);
    }).catch(err => {
      this.loadingImages.delete(url);
      throw err;
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

// 싱글톤 인스턴스
export const imageLoadTracker = new ImageLoadTracker();
