import { createHash } from 'node:crypto';

export function hashMobileUploadEditorSession(sessionId: string | null | undefined) {
  const value = sessionId?.trim();
  return value ? createHash('sha256').update(value, 'utf8').digest('hex') : null;
}

export function getMobileUploadVariantPaths(slug: string, path: string, variant: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug)) return null;
  const prefix = `wedding-images/${slug}/`;
  if (!path.startsWith(prefix)) return null;
  const file = path.slice(prefix.length);
  if (!file || file.length > 250 || /[\\/\u0000-\u001f\u007f%?#]/.test(file) || file.includes('..') || !file.endsWith('.webp')) return null;
  let original = file;
  if (variant === 'content') {
    if (!file.startsWith('content-')) return null;
    original = file.slice(8);
  } else if (variant === 'thumbnail') {
    if (!file.startsWith('thumb-')) return null;
    original = file.slice(6);
  } else if (variant !== 'original') return null;
  // Match server-generated optimized asset names, not arbitrary browser objects.
  if (!/^(?:cover|favicon|gallery|share-preview|kakao-card)-(?:[a-z0-9.-]+-)?\d+-[a-z0-9]+\.webp$/.test(original)) return null;
  return [prefix + original, prefix + 'content-' + original, prefix + 'thumb-' + original];
}
