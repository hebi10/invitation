export interface MediaAssetFile {
  name: string;
  path: string;
  url: string;
  uploadedAt: Date | null;
  variant?: string;
}

export interface MediaAsset {
  name: string;
  path: string;
  url: string;
  originalPath?: string;
  originalUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  uploadedAt: Date | null;
}

export interface MediaUsageReference {
  value: string;
  label: string;
}

/** 기존 브라우저 업로드와 서버 업로드의 변형 파일을 한 사진으로 묶습니다. */
export function groupMediaAssetFiles(files: MediaAssetFile[]): MediaAsset[] {
  const names = new Set(files.map((file) => file.path));
  const groups = new Map<string, MediaAssetFile[]>();
  for (const file of files) {
    const directory = file.path.slice(0, file.path.lastIndexOf('/') + 1);
    let name = file.name;
    if (name.startsWith('thumb-') && (!file.variant || file.variant === 'thumbnail')) name = name.slice(6);
    else if (name.startsWith('original-') && (file.variant === 'original' || (!file.variant && names.has(`${directory}${name.slice(9)}`)))) name = name.slice(9);
    else if (name.startsWith('content-') && (!file.variant || file.variant === 'content') && !names.has(`${directory}original-${name}`) && (file.variant === 'content' || names.has(`${directory}${name.slice(8)}`))) name = name.slice(8);
    const key = `${directory}${name}`;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  return [...groups.values()].map((variants) => {
    const thumbnail = variants.find((file) => file.variant === 'thumbnail' || (!file.variant && file.name.startsWith('thumb-')));
    const content = variants.find((file) => file.variant === 'content')
      ?? variants.find((file) => !file.variant && file.name.startsWith('content-'))
      ?? variants.find((file) => file !== thumbnail && file.variant !== 'original' && !file.name.startsWith('original-'));
    const original = variants.find((file) => file.variant === 'original' || (!file.variant && file.name.startsWith('original-')))
      ?? (content?.name.startsWith('content-') ? variants.find((file) => file !== content && file !== thumbnail) : undefined);
    const display = content ?? original ?? thumbnail ?? variants[0];
    return {
      name: display.name,
      path: display.path,
      url: display.url,
      ...(original ? { originalPath: original.path, originalUrl: original.url } : {}),
      thumbnailPath: thumbnail?.path ?? display.path,
      thumbnailUrl: thumbnail?.url ?? display.url,
      uploadedAt: display.uploadedAt,
    };
  }).sort((left, right) => (left.uploadedAt?.getTime() ?? 0) - (right.uploadedAt?.getTime() ?? 0));
}

export function getMediaAssetPaths(asset: MediaAsset) {
  return [...new Set([asset.path, asset.originalPath, asset.thumbnailPath].filter((value): value is string => Boolean(value)))];
}

function normalizedReference(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('wedding-images/')) return trimmed;
  try {
    const url = new URL(trimmed, 'https://local.invalid');
    const encodedStoragePath = url.pathname.match(/\/o\/(.+)$/)?.[1];
    if (encodedStoragePath) return decodeURIComponent(encodedStoragePath);
    const decodedPath = decodeURIComponent(url.pathname);
    const storageStart = decodedPath.indexOf('wedding-images/');
    if (storageStart >= 0) return decodedPath.slice(storageStart);
    return `${url.origin}${decodedPath}`;
  } catch {
    return trimmed;
  }
}

function referenceLabel(keys: string[], memory: boolean) {
  const field = keys.join('.');
  if (memory) {
    if (field.includes('hero')) return '추억 페이지 대표 이미지';
    if (field.includes('gallery')) return '추억 페이지 갤러리';
    return '추억 페이지';
  }
  const themeIndex = keys.indexOf('themeOverrides');
  const theme = themeIndex >= 0 ? ` (${keys[themeIndex + 1]})` : '';
  if (field.includes('gallery')) return `갤러리${theme}`;
  if (field.includes('kakaoCard')) return '카카오 공유 이미지';
  if (field.includes('social')) return '공유 미리보기';
  if (field.includes('favicon')) return '파비콘';
  if (field.includes('wedding') || field.includes('coverImage')) return `대표 이미지${theme}`;
  return `초대장 ${field}`;
}

export function collectMediaUsageReferences(config: unknown, memory: unknown): MediaUsageReference[] {
  const references: MediaUsageReference[] = [];
  function visit(value: unknown, keys: string[], isMemory: boolean) {
    if (typeof value === 'string') {
      if (/^(https?:\/\/|gs:\/\/|\/|wedding-images\/)/.test(value.trim())) {
        references.push({ value, label: referenceLabel(keys, isMemory) });
      }
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) visit(child, [...keys, key], isMemory);
  }
  visit(config, [], false);
  visit(memory, [], true);
  return references;
}

export function getMediaAssetUsage(asset: MediaAsset, references: MediaUsageReference[]) {
  const identities = new Set([
    ...getMediaAssetPaths(asset), asset.url, asset.originalUrl, asset.thumbnailUrl,
  ].filter((value): value is string => Boolean(value)).map(normalizedReference));
  return [...new Set(references.filter((reference) => identities.has(normalizedReference(reference.value))).map((reference) => reference.label))];
}
