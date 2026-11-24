import 'server-only';

import type { InvitationPage } from '@/types/invitationPage';
import { buildInvitationPreviewMediaUrl, mapInvitationImageFields, type InvitationPreviewMediaMode } from '@/lib/invitationPreviewMedia';
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

/** Traverse exactly the same persisted image fields used by the public gateway.
 * Only clone branches that change. Never mutate the original Firestore snapshot.
 */
export function mapStoredInvitationImageReferences(raw: unknown, transform: (value: string) => string): unknown {
  const root = record(raw);
  if (!root) return raw;
  const nested = record(root.content);
  const content = nested ?? root;

  function scalar(value: unknown) {
    return typeof value === 'string' && value.trim() ? transform(value) : value;
  }
  function mapFields(input: Record<string, unknown>, single: readonly string[], arrays: readonly string[]) {
    let next = input;
    function set(key: string, value: unknown) {
      if (input[key] !== value) {
        if (next === input) next = { ...input };
        next[key] = value;
      }
    }
    for (const field of single) if (Object.hasOwn(input, field)) set(field, scalar(input[field]));
    for (const field of arrays) {
      const values = input[field];
      if (Array.isArray(values)) {
        const mapped = values.map(scalar);
        if (mapped.some((value, index) => value !== values[index])) set(field, mapped);
      }
    }
    return next;
  }

  let result = content;
  const metadata = record(content.metadata);
  const images = record(metadata?.images);
  if (metadata && images) {
    const next = mapFields(images, IMAGE_FIELDS, []);
    if (next !== images) result = { ...result, metadata: { ...metadata, images: next } };
  }
  const pageData = record(content.pageData);
  if (pageData) {
    let next = mapFields(pageData, DATA_SINGLE_FIELDS, DATA_ARRAY_FIELDS);
    const overrides = record(pageData.themeOverrides);
    if (overrides) {
      const mapped = Object.entries(overrides).map(([theme, value]) => {
        const data = record(value);
        return [theme, data ? mapFields(data, DATA_SINGLE_FIELDS, DATA_ARRAY_FIELDS) : value] as const;
      });
      if (mapped.some(([theme, value]) => value !== overrides[theme])) next = { ...next, themeOverrides: Object.fromEntries(mapped) };
    }
    if (next !== pageData) result = { ...result, pageData: next };
  }
  if (result === content) return raw;
  return nested ? { ...root, content: result } : result;
}

/** Only image-bearing fields in persisted content are eligible for the public gateway. */
export function collectPublicInvitationImageReferences(raw: unknown): string[] {
  const references: string[] = [];
  mapStoredInvitationImageReferences(raw, value => {
    references.push(value);
    return value;
  });
  return references;
}

/** Non-persisted renderer view only. Never use this in edit or save endpoints. */
function projectPilotInvitationMedia(
  page: InvitationPage | null,
  requestedSlug: string,
  dependencies: { pilotSlug: string; bucketName: string },
  mode: 'public' | InvitationPreviewMediaMode,
): InvitationPage | null {
  if (!page || !dependencies.pilotSlug || requestedSlug !== dependencies.pilotSlug ||
      page.slug !== requestedSlug || (page.eventType ?? 'wedding') !== 'wedding') return page;
  if (!dependencies.bucketName) throw new Error('Pilot media storage is not configured.');

  const project = (value: string | undefined) => {
    if (!value) return value;
    const file = getInvitationMediaFileName(value, dependencies.bucketName, requestedSlug);
    if (file) return mode === 'public' ? buildInvitationMediaGatewayUrl(requestedSlug, file) : buildInvitationPreviewMediaUrl(requestedSlug, file, mode);
    // Never emit a managed token URL for an unsupported or cross-event image on the pilot.
    const trimmed = value.trim();
    if (/^(?:\/?wedding-images\/|gs:\/\/|\/api\/public\/media\/)/i.test(trimmed)) return '';
    try {
      const url = new URL(trimmed, 'https://invite.msgnote.kr');
      if (['firebasestorage.googleapis.com', 'storage.googleapis.com'].includes(url.hostname) ||
          (url.origin === 'https://invite.msgnote.kr' && url.pathname.startsWith('/api/public/media/'))) return '';
    } catch { /* Local/static image paths stay unchanged. */ }
    return value;
  };
  return mapInvitationImageFields(page, value => project(value) ?? '');
}

function defaultProjectionDependencies() {
  return { pilotSlug: process.env.INVITATION_MEDIA_GATEWAY_PILOT_SLUG ?? '', bucketName: getServerStorageBucketName() ?? '' };
}

export function projectPilotPublicInvitationMedia(page: InvitationPage | null, requestedSlug: string, dependencies = defaultProjectionDependencies()) {
  return projectPilotInvitationMedia(page, requestedSlug, dependencies, 'public');
}

/** Call only after the existing owner/preview-token authorization has succeeded. */
export function projectPilotPrivateInvitationMedia(page: InvitationPage, requestedSlug: string,
  mode: InvitationPreviewMediaMode, dependencies = defaultProjectionDependencies()): InvitationPage {
  return projectPilotInvitationMedia(page, requestedSlug, dependencies, mode) ?? page;
}
