import {
  getAllWeddingPageSeeds,
  getWeddingPageBySlug as getWeddingSeedBySlug,
  type WeddingPageConfig,
} from '@/config/weddingPages';

export interface WeddingPageInfo {
  slug: string;
  displayName: string;
  description?: string;
  date?: string;
  venue?: string;
  variants?: {
    emotional?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    simple?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    minimal?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    space?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    blue?: {
      available: boolean;
      path: string;
      displayName: string;
    };
    classic?: {
      available: boolean;
      path: string;
      displayName: string;
    };
  };
}

export function getWeddingPagesClient(): WeddingPageInfo[] {
  return getAllWeddingPageSeeds().map((config) => ({
    slug: config.slug,
    displayName: config.displayName || '',
    description: config.description,
    date: config.date,
    venue: config.venue,
    variants: config.variants,
  }));
}

export function getWeddingPageBySlug(slug: string): WeddingPageInfo | undefined {
  const config = getWeddingSeedBySlug(slug);
  if (!config) {
    return undefined;
  }

  return {
    slug: config.slug,
    displayName: config.displayName || '',
    description: config.description,
    date: config.date,
    venue: config.venue,
    variants: config.variants,
  };
}

export function getWeddingPageConfig(slug: string): WeddingPageConfig | undefined {
  return getWeddingSeedBySlug(slug);
}
