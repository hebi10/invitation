export interface OptimizeUploadImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxBytes?: number;
}

function loadBrowserImage(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for compression.'));
    image.src = objectUrl;
  });
}

export async function optimizeUploadImage(
  file: File,
  options: OptimizeUploadImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 2200,
    maxHeight = 2200,
    quality = 0.82,
    maxBytes = 1.8 * 1024 * 1024,
  } = options;

  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml'
  ) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadBrowserImage(objectUrl);
    const widthRatio = maxWidth / image.naturalWidth;
    const heightRatio = maxHeight / image.naturalHeight;
    const scale = Math.min(1, widthRatio, heightRatio);
    const outputWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const outputHeight = Math.max(1, Math.round(image.naturalHeight * scale));
    const shouldResize = scale < 1;
    const shouldReencode = file.size > maxBytes && (file.type === 'image/jpeg' || file.type === 'image/webp');

    if (!shouldResize && !shouldReencode) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, outputWidth, outputHeight);

    const targetType = file.type === 'image/webp' ? 'image/webp' : file.type === 'image/jpeg' ? 'image/jpeg' : file.type;
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, targetType, quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const extension = targetType === 'image/webp' ? 'webp' : targetType === 'image/jpeg' ? 'jpg' : file.name.split('.').pop() || 'png';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    return new File([blob], `${baseName}.${extension}`, {
      type: targetType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Image optimization failed, uploading original file.', error);
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
