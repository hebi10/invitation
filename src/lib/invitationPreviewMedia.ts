import type { InvitationPage, InvitationPageSeed, InvitationPageData, InvitationPageDataBase } from '@/types/invitationPage';

const IMAGE_FIELDS = ['wedding', 'favicon', 'social', 'kakaoCard'] as const;
const DATA_SINGLE_FIELDS = ['coverImageThumbnailUrl'] as const;
const DATA_ARRAY_FIELDS = ['galleryImages', 'galleryImageThumbnailUrls'] as const;

export type InvitationPreviewMediaMode = 'customer' | 'mobile';

export function buildInvitationPreviewMediaUrl(slug: string, file: string, mode: InvitationPreviewMediaMode) {
  const encodedSlug = encodeURIComponent(slug);
  const encodedFile = encodeURIComponent(file);
  return mode === 'customer'
    ? `/api/customer/events/${encodedSlug}/media/${encodedFile}/`
    : `/api/mobile/client-editor/pages/${encodedSlug}/preview/?media=${encodedFile}`;
}

/** Only canonical same-origin paths for the requested invitation may receive a bearer header. */
export function isInvitationPreviewMediaUrl(value: string, slug: string, mode: InvitationPreviewMediaMode) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug)) return false;
  const prefix = mode === 'customer'
    ? `/api/customer/events/${encodeURIComponent(slug)}/media/`
    : `/api/mobile/client-editor/pages/${encodeURIComponent(slug)}/preview/?media=`;
  if (!value.startsWith(prefix)) return false;
  try {
    const encoded = value.slice(prefix.length, mode === 'customer' ? -1 : undefined);
    const file = decodeURIComponent(encoded);
    return Boolean(file && file.length <= 250 && file !== '.' && file !== '..' &&
      !/[\\/\u0000-\u001f\u007f%?#]/.test(file) && /\.(?:jpe?g|png|webp)$/i.test(file) &&
      value === buildInvitationPreviewMediaUrl(slug, file, mode));
  } catch { return false; }
}

export function mapInvitationImageFields<T extends InvitationPageSeed>(page: T, project: (value: string) => string): T {
  const images = { ...page.metadata.images };
  for (const key of IMAGE_FIELDS) {
    const value = images[key];
    if (typeof value === 'string') images[key] = project(value);
  }
  function projectData<T extends InvitationPageDataBase>(data: T): T {
    const next = { ...data };
    for (const key of DATA_SINGLE_FIELDS) {
      if (typeof next[key] === 'string') next[key] = project(next[key]);
    }
    for (const key of DATA_ARRAY_FIELDS) {
      const values = next[key];
      if (Array.isArray(values)) next[key] = values.map(value => project(value));
    }
    return next;
  }
  let pageData: InvitationPageData | undefined;
  if (page.pageData) {
    pageData = projectData(page.pageData);
    if (pageData.themeOverrides) {
      const overrides = { ...pageData.themeOverrides };
      for (const key of Object.keys(overrides) as Array<keyof typeof overrides>) {
        const override = overrides[key];
        if (override) overrides[key] = projectData(override);
      }
      pageData.themeOverrides = overrides;
    }
  }
  return { ...page, metadata: { ...page.metadata, images }, ...(pageData ? { pageData } : {}) };
}

export function collectInvitationPreviewMediaUrls(page: InvitationPageSeed, slug: string, mode: InvitationPreviewMediaMode) {
  const urls = new Set<string>();
  mapInvitationImageFields(page, value => {
    if (isInvitationPreviewMediaUrl(value, slug, mode)) urls.add(value);
    return value;
  });
  return [...urls];
}


const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 96 * 1024 * 1024;
const MAX_PREVIEW_IMAGES = 100;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface MaterializedInvitationPreviewMedia {
  page: InvitationPage;
  dispose: () => void;
}

/** Keep authenticated image bytes in this preview only. Never place credentials in image URLs. */
export async function materializeInvitationMediaUrls(
  inputUrls: readonly string[],
  slug: string,
  mode: InvitationPreviewMediaMode,
  token: string,
  signal: AbortSignal,
  dependencies = {
    fetchImage: (url: string, options: RequestInit) => fetch(url, options),
    createObjectUrl: (blob: Blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url: string) => URL.revokeObjectURL(url),
  },
) {
  const urls = [...new Set(inputUrls)];
  const objects = new Map<string, string>();
  const dispose = () => {
    objects.forEach(url => dependencies.revokeObjectUrl(url));
    objects.clear();
  };
  if (!urls.length) return { objects, dispose };
  if (!token || /\s/.test(token) || urls.length > MAX_PREVIEW_IMAGES) {
    throw new Error('이미지 미리보기 권한 또는 사진 수를 확인해 주세요.');
  }
  let totalBytes = 0;
  try {
    for (let offset = 0; offset < urls.length; offset += 3) {
      // Wait for every started request before cleanup, including failures.
      const results = await Promise.allSettled(urls.slice(offset, offset + 3).map(async url => {
        signal.throwIfAborted();
        if (!isInvitationPreviewMediaUrl(url, slug, mode)) throw new Error('Invalid preview image path.');
        const response = await dependencies.fetchImage(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store', redirect: 'error', credentials: 'omit',
          referrerPolicy: 'no-referrer', signal,
        });
        if (!response.ok || !IMAGE_TYPES.includes(response.headers.get('content-type') ?? '')) {
          throw new Error('이미지를 불러오지 못했습니다. 로그인 상태를 확인해 주세요.');
        }
        const blob = await response.blob();
        signal.throwIfAborted();
        if (!IMAGE_TYPES.includes(blob.type) || !blob.size || blob.size > MAX_IMAGE_BYTES ||
            totalBytes + blob.size > MAX_PREVIEW_BYTES) {
          throw new Error('미리보기 이미지 용량을 확인해 주세요.');
        }
        totalBytes += blob.size;
        objects.set(url, dependencies.createObjectUrl(blob));
      }));
      const rejected = results.find(result => result.status === 'rejected');
      if (rejected) throw new Error('사진을 불러오지 못했습니다. 미리보기를 다시 열어 주세요.');
    }
    signal.throwIfAborted();
    return { objects, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}


export async function materializeInvitationPreviewMedia(
  page: InvitationPage,
  slug: string,
  mode: InvitationPreviewMediaMode,
  token: string,
  signal: AbortSignal,
  dependencies?: Parameters<typeof materializeInvitationMediaUrls>[5],
): Promise<MaterializedInvitationPreviewMedia> {
  const { objects, dispose } = await materializeInvitationMediaUrls(
    collectInvitationPreviewMediaUrls(page, slug, mode), slug, mode, token, signal, dependencies,
  );
  return { page: objects.size ? mapInvitationImageFields(page, value => objects.get(value) ?? value) : page, dispose };
}
