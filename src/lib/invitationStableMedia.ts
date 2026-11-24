import type { InvitationPageSeed } from '@/types/invitationPage';
import { buildInvitationPreviewMediaUrl, mapInvitationImageFields } from './invitationPreviewMedia';

const ORIGIN = 'https://invite.msgnote.kr';

export function isStableInvitationImageReference(value: string) {
  const source = value.trim();
  return source.startsWith('/api/public/media/') || source.startsWith(ORIGIN + '/api/public/media/');
}

/** Parse only the exact canonical image path. Never infer an external URL or attach credentials to one. */
export function getStableInvitationImageFile(value: string, slug: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug)) return null;
  const source = value.trim();
  const relative = source.startsWith(ORIGIN + '/') ? source.slice(ORIGIN.length) : source;
  const prefix = `/api/public/media/${encodeURIComponent(slug)}/`;
  if (!relative.startsWith(prefix) || !relative.endsWith('/')) return null;
  try {
    const file = decodeURIComponent(relative.slice(prefix.length, -1));
    if (!file || file.length > 250 || !/\.(?:jpe?g|png|webp)$/i.test(file) ||
        /[\\/\u0000-\u001f\u007f%?#]/.test(file) ||
        relative !== prefix + encodeURIComponent(file) + '/') return null;
    return file;
  } catch { return null; }
}

export function getWizardProtectedMediaUrl(value: string, slug: string) {
  const file = getStableInvitationImageFile(value, slug);
  return file ? buildInvitationPreviewMediaUrl(slug, file, 'customer') : null;
}

export function collectWizardProtectedMediaUrls(config: InvitationPageSeed, slug: string) {
  const urls = new Set<string>();
  mapInvitationImageFields(config, value => {
    const url = getWizardProtectedMediaUrl(value, slug);
    if (url) urls.add(url);
    return value;
  });
  return [...urls].sort();
}

/** This is a view-only mapping; saved config and the selection identity never contain blob URLs. */
export function resolveWizardMediaDisplayUrl(value: string, slug: string, objects: ReadonlyMap<string, string>) {
  const url = getWizardProtectedMediaUrl(value, slug);
  if (url) return objects.get(url) ?? '';
  return isStableInvitationImageReference(value) ? '' : value;
}
