import 'server-only';

import type { InvitationPage, InvitationPageDataBase, InvitationPageData } from '@/types/invitationPage';
import { getServerStorageBucketName } from './firebaseAdmin';

const IMAGE_FIELDS = ['wedding', 'favicon', 'social', 'kakaoCard'] as const;
const DATA_SINGLE_FIELDS = ['coverImageThumbnailUrl'] as const;
const DATA_ARRAY_FIELDS = ['galleryImages', 'galleryImageThumbnailUrls'] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function isInvitationMediaSlug(slug: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug);
}

export function isInvitationMediaFile(file: string) {
  return Boolean(file && file.length <= 250 && file !== '.' && file !== '..' &&
    !/[\\/\u0000-\u001f\u007f%?#]/.test(file) && /\.(?:jpe?g|png|webp)$/i.test(file));
}

export function buildInvitationMediaGatewayUrl(slug: string, file: string) {
  return `/api/public/media/${encodeURIComponent(slug)}/${encodeURIComponent(file)}/`;
}

/** Resolve only an exact same-bucket, same-event image reference. Never fetch the supplied URL. */
export function getInvitationMediaFileName(value: string, bucketName: string, slug: string): string | null {
  if (!bucketName || !isInvitationMediaSlug(slug)) return null;
  const source = value.trim();
  const storagePrefix = `wedding-images/${slug}/`;
  const gatewayPrefix = `/api/public/media/${encodeURIComponent(slug)}/`;
  let path = '';
  try {
    if (source.startsWith(storagePrefix)) path = source;
    else if (source.startsWith(gatewayPrefix) && source.endsWith('/')) {
      path = storagePrefix + decodeURIComponent(source.slice(gatewayPrefix.length, -1));
    } else {
      const url = new URL(source);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      if (url.hostname === 'firebasestorage.googleapis.com' && !url.port) {
        const prefix = `/v0/b/${encodeURIComponent(bucketName)}/o/`;
        if (!url.pathname.startsWith(prefix)) return null;
        path = decodeURIComponent(url.pathname.slice(prefix.length));
      } else if (url.origin === 'https://invite.msgnote.kr' && !url.search && !url.hash &&
          url.pathname.startsWith(gatewayPrefix) && url.pathname.endsWith('/')) {
        path = storagePrefix + decodeURIComponent(url.pathname.slice(gatewayPrefix.length, -1));
      } else return null;
    }
  } catch { return null; }
  if (!path.startsWith(storagePrefix)) return null;
  const file = path.slice(storagePrefix.length);
  return isInvitationMediaFile(file) ? file : null;
}

/** Only image-bearing fields in persisted content are eligible for the public gateway. */
export function collectPublicInvitationImageReferences(raw: unknown): string[] {
  const root = record(raw);
  if (!root) return [];
  const content = record(root.content) ?? root;
  const images = record(record(content.metadata)?.images);
  const pageData = record(content.pageData);
  const references: string[] = [];
  function add(value: unknown) {
    if (typeof value === 'string' && value.trim()) references.push(value);
  }
  for (const field of IMAGE_FIELDS) add(images?.[field]);
  function readData(data: Record<string, unknown> | null) {
    for (const field of DATA_SINGLE_FIELDS) add(data?.[field]);
    for (const field of DATA_ARRAY_FIELDS) {
      const values = data?.[field];
      if (Array.isArray(values)) values.forEach(add);
    }
  }
  readData(pageData);
  const overrides = record(pageData?.themeOverrides);
  if (overrides) Object.values(overrides).forEach(value => readData(record(value)));
  return references;
}

/** A non-persisted public view only; do not use this in editor responses or saves. */
export function projectPilotPublicInvitationMedia(
  page: InvitationPage | null,
  requestedSlug: string,
  dependencies = {
    pilotSlug: process.env.INVITATION_MEDIA_GATEWAY_PILOT_SLUG ?? '',
    bucketName: getServerStorageBucketName() ?? '',
  },
): InvitationPage | null {
  if (!page || !dependencies.pilotSlug || requestedSlug !== dependencies.pilotSlug ||
      page.slug !== requestedSlug || (page.eventType ?? 'wedding') !== 'wedding') return page;
  if (!dependencies.bucketName) throw new Error('Pilot media storage is not configured.');

  const project = (value: string | undefined) => {
    if (!value) return value;
    const file = getInvitationMediaFileName(value, dependencies.bucketName, requestedSlug);
    if (file) return buildInvitationMediaGatewayUrl(requestedSlug, file);
    // Never emit a managed token URL for an unsupported or cross-event image on the pilot.
    const trimmed = value.trim();
    if (/^(?:wedding-images\/|\/api\/public\/media\/)/i.test(trimmed)) return '';
    try {
      const url = new URL(trimmed);
      if (url.hostname === 'firebasestorage.googleapis.com' ||
          (url.origin === 'https://invite.msgnote.kr' && url.pathname.startsWith('/api/public/media/'))) return '';
    } catch { /* Local/static image paths stay unchanged. */ }
    return value;
  };
  const images = { ...page.metadata.images };
  for (const key of IMAGE_FIELDS) {
    const value = images[key];
    if (typeof value === 'string') images[key] = project(value) ?? '';
  }
  function projectData<T extends InvitationPageDataBase>(data: T): T {
    const next = { ...data };
    for (const key of DATA_SINGLE_FIELDS) {
      if (typeof next[key] === 'string') next[key] = project(next[key]);
    }
    for (const key of DATA_ARRAY_FIELDS) {
      const values = next[key];
      if (Array.isArray(values)) next[key] = values.map(value => project(value) ?? '');
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
