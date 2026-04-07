export type EditableImageAssetKind = 'cover' | 'favicon' | 'gallery';

export const IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const IMAGE_UPLOAD_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const IMAGE_UPLOAD_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export function getEditableImageAssetLabel(kind: EditableImageAssetKind) {
  switch (kind) {
    case 'cover':
      return '대표 이미지';
    case 'favicon':
      return '파비콘';
    case 'gallery':
      return '갤러리 이미지';
    default:
      return '이미지';
  }
}

export function getImageUploadBatchLimit(kind: EditableImageAssetKind) {
  return kind === 'gallery' ? 10 : 1;
}

function getFileExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.trim().toLowerCase() ?? '';
  return extension;
}

export function validateEditableImageFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  const extension = getFileExtension(file.name);

  if (!extension || !IMAGE_UPLOAD_ALLOWED_EXTENSIONS.includes(extension as never)) {
    return 'JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.';
  }

  if (
    file.type &&
    !IMAGE_UPLOAD_ALLOWED_MIME_TYPES.includes(file.type as never)
  ) {
    return '지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP 파일을 사용해 주세요.';
  }

  if (file.size > IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES) {
    return '이미지 파일은 8MB 이하만 업로드할 수 있습니다.';
  }

  return null;
}

export function validateEditableImageBatch(
  files: Array<Pick<File, 'name' | 'size' | 'type'>>,
  kind: EditableImageAssetKind,
  maxFiles = getImageUploadBatchLimit(kind)
) {
  if (files.length === 0) {
    return '업로드할 이미지를 선택해 주세요.';
  }

  if (files.length > maxFiles) {
    return kind === 'gallery'
      ? `한 번에 최대 ${maxFiles}장의 갤러리 이미지만 올릴 수 있습니다.`
      : `${getEditableImageAssetLabel(kind)}는 한 장만 업로드할 수 있습니다.`;
  }

  const invalidMessage = files
    .map((file) => validateEditableImageFile(file))
    .find(Boolean);

  return invalidMessage ?? null;
}

export function getEditableImageUploadHint(kind: EditableImageAssetKind) {
  return kind === 'gallery'
    ? 'JPG, PNG, WEBP · 각 8MB 이하 · 한 번에 최대 10장'
    : 'JPG, PNG, WEBP · 8MB 이하 · 1장 업로드';
}
