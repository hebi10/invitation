export type MemoryPageVisibility = 'private' | 'public' | 'unlisted';
export type MemoryImageSource = 'invitation' | 'memory';
export type MemoryGalleryCategory = 'preWedding' | 'ceremony' | 'afterParty' | 'snap' | 'etc';

export interface MemoryHeroImageCrop {
  focusX: number;
  focusY: number;
  zoom: number;
}

export interface MemoryGalleryImage {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  path: string;
  thumbnailPath?: string;
  source: MemoryImageSource;
  category: MemoryGalleryCategory;
  caption: string;
  order: number;
}

export interface MemorySelectedComment {
  id: string;
  sourceCommentId?: string;
  author: string;
  message: string;
  createdAt: Date;
  isVisible: boolean;
  order: number;
}

export interface MemoryTimelineItem {
  id: string;
  title: string;
  description: string;
  eventTime: string;
  order: number;
}

export interface MemoryPage {
  pageSlug: string;
  enabled: boolean;
  visibility: MemoryPageVisibility;
  title: string;
  subtitle: string;
  introMessage: string;
  thankYouMessage: string;
  heroImage: MemoryGalleryImage | null;
  heroImageCrop: MemoryHeroImageCrop;
  heroThumbnailUrl: string;
  weddingDate: string;
  venueName: string;
  venueAddress: string;
  groomName: string;
  brideName: string;
  galleryImages: MemoryGalleryImage[];
  selectedComments: MemorySelectedComment[];
  timelineItems: MemoryTimelineItem[];
  seoTitle: string;
  seoDescription: string;
  seoNoIndex: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_MEMORY_HERO_CROP: MemoryHeroImageCrop = {
  focusX: 50,
  focusY: 50,
  zoom: 1,
};
