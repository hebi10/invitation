const RESERVED_ROUTE_SEGMENTS = new Set([
  'admin',
  'api',
  'memory',
  'page-editor',
  'page-wizard',
]);
const ENGLISH_NAME_PATTERN = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;

function normalizeSlug(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
}

function pickSlugFromSegments(segments: string[]) {
  if (segments.length === 0) {
    return '';
  }

  if (RESERVED_ROUTE_SEGMENTS.has(segments[0])) {
    return normalizeSlug(segments[1] ?? '');
  }

  return normalizeSlug(segments[0]);
}

export function normalizePageSlugBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidEnglishName(value: string) {
  return ENGLISH_NAME_PATTERN.test(value.trim());
}

function normalizeEnglishNameFragment(value: string) {
  return normalizePageSlugBase(value).replace(/[0-9]/g, '');
}

export function buildPageSlugBaseFromEnglishNames(
  groomEnglishName: string,
  brideEnglishName: string
) {
  return normalizePageSlugBase(
    [normalizeEnglishNameFragment(groomEnglishName), normalizeEnglishNameFragment(brideEnglishName)]
      .filter(Boolean)
      .join('-')
  );
}

export function extractPageSlugFromIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (!trimmed.includes('/')) {
    return normalizeSlug(trimmed);
  }

  try {
    const candidateUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(`https://mobile-invitation.local/${trimmed.replace(/^\/+/, '')}`);

    const segments = candidateUrl.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    return pickSlugFromSegments(segments);
  } catch {
    const segments = trimmed
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    return pickSlugFromSegments(segments);
  }
}
