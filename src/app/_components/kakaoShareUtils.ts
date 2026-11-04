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

export function normalizeKakaoShareLinkUrl(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    const segment = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] ?? '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      ['admin', 'api', 'mobile-preview', 'mobile-share', 'my-invitations', 'page-wizard', 'page-editor', 'wizard-preview'].includes(segment)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function buildKakaoLinkSharePayload(shareUrl: string, title: string, description: string) {
  const link = { mobileWebUrl: shareUrl, webUrl: shareUrl };
  return {
    objectType: 'text' as const,
    text: `${title}\n${description}`,
    link,
    buttons: [{ title: '초대장 보기', link }],
  };
}

export function buildKakaoCardSharePayload(shareUrl: string, title: string, description: string, imageUrl: string) {
  const link = { mobileWebUrl: shareUrl, webUrl: shareUrl };
  return {
    objectType: 'feed' as const,
    content: { title, description, imageUrl, link },
    buttons: [{ title: '초대장 보기', link }],
  };
}
