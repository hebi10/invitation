export function normalizeKakaoShareImageUrl(value: unknown, origin: string) {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed, origin || undefined);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}

export function buildKakaoShareImageCandidates(
  values: unknown[],
  origin: string
) {
  return values.reduce<string[]>((candidates, value) => {
    const imageUrl = normalizeKakaoShareImageUrl(value, origin);

    if (imageUrl && !candidates.includes(imageUrl)) {
      candidates.push(imageUrl);
    }

    return candidates;
  }, []);
}
