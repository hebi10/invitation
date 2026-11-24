import type { InvitationPage, InvitationPageData, InvitationPageDataBase } from '@/types/invitationPage';

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

export function mapInvitationImageFields(page: InvitationPage, project: (value: string) => string): InvitationPage {
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

export function collectInvitationPreviewMediaUrls(page: InvitationPage, slug: string, mode: InvitationPreviewMediaMode) {
  const urls = new Set<string>();
  mapInvitationImageFields(page, value => {
    if (isInvitationPreviewMediaUrl(value, slug, mode)) urls.add(value);
    return value;
  });
  return [...urls];
}
