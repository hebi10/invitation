export type RomanticInfoTab = 'summary' | 'detail' | 'guide';

interface RomanticInfoTabState {
  activeTab: RomanticInfoTab;
  hasSummary: boolean;
  hasDetail: boolean;
  hasGuide: boolean;
}

export function resolveRomanticInfoTab({
  activeTab,
  hasSummary,
  hasDetail,
  hasGuide,
}: RomanticInfoTabState): RomanticInfoTab | null {
  const availableTabs = [
    ...(hasSummary ? (['summary'] as const) : []),
    ...(hasDetail ? (['detail'] as const) : []),
    ...(hasGuide ? (['guide'] as const) : []),
  ];

  if (availableTabs.includes(activeTab)) {
    return activeTab;
  }

  return availableTabs[0] ?? null;
}

export function shouldRenderRomanticGallery(images: string[], imagesLoading: boolean) {
  return imagesLoading || images.length > 0;
}

interface RomanticLocationState {
  venue?: string;
  address?: string;
  description?: string;
  contact?: string;
  latitude?: number;
  longitude?: number;
}

export function shouldRenderRomanticLocation({
  venue,
  address,
  description,
  contact,
  latitude,
  longitude,
}: RomanticLocationState) {
  if ([venue, address, description, contact].some((value) => Boolean(value?.trim()))) {
    return true;
  }

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}
