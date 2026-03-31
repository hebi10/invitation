const HEART_ICON_TAG_PAIR_PATTERN =
  /<\s*HeartIcon(?:_1)?\b[^>]*>\s*<\s*\/\s*HeartIcon(?:_1)?\s*>/gi;
const HEART_ICON_TAG_PATTERN = /<\s*\/?\s*HeartIcon(?:_1)?\b[^>]*>/gi;
const HEART_ICON_ENCODED_TAG_PAIR_PATTERN =
  /&lt;\s*HeartIcon(?:_1)?\b[\s\S]*?&gt;\s*&lt;\s*\/\s*HeartIcon(?:_1)?\s*&gt;/gi;
const HEART_ICON_ENCODED_TAG_PATTERN =
  /&lt;\s*\/?\s*HeartIcon(?:_1)?\b[\s\S]*?&gt;/gi;

export function normalizeHeartIconPlaceholderText(value: string, replacement = '\u2661') {
  if (!value) {
    return value;
  }

  return value
    .replace(HEART_ICON_TAG_PAIR_PATTERN, ` ${replacement} `)
    .replace(HEART_ICON_TAG_PATTERN, ` ${replacement} `)
    .replace(HEART_ICON_ENCODED_TAG_PAIR_PATTERN, ` ${replacement} `)
    .replace(HEART_ICON_ENCODED_TAG_PATTERN, ` ${replacement} `)
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function sanitizeHeartIconPlaceholdersDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeHeartIconPlaceholderText(value) as T;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeHeartIconPlaceholdersDeep(item)) as T;
  }

  if (typeof value === 'object') {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>).map(
      ([key, entryValue]) => [key, sanitizeHeartIconPlaceholdersDeep(entryValue)]
    );

    return Object.fromEntries(sanitizedEntries) as T;
  }

  return value;
}