export type MobileInvitationProductTier = 'standard' | 'deluxe' | 'premium';
export type MobileInvitationThemeKey = 'emotional' | 'simple';

export interface MobileInvitationFeatureFlags {
  maxGalleryImages: number;
  shareMode: 'link' | 'card' | 'none';
  showMusic: boolean;
  showCountdown: boolean;
  showGuestbook: boolean;
}

export interface MobileInvitationPerson {
  name: string;
  order?: string;
  phone?: string;
  father?: {
    relation: string;
    name: string;
    phone?: string;
  };
  mother?: {
    relation: string;
    name: string;
    phone?: string;
  };
}

export interface MobileInvitationSeed {
  slug: string;
  displayName: string;
  description: string;
  date: string;
  venue: string;
  groomName: string;
  brideName: string;
  productTier?: MobileInvitationProductTier;
  features?: Partial<MobileInvitationFeatureFlags>;
  musicEnabled?: boolean;
  musicVolume?: number;
  musicCategoryId?: string;
  musicTrackId?: string;
  couple: {
    groom: MobileInvitationPerson;
    bride: MobileInvitationPerson;
  };
  pageData?: {
    greetingMessage?: string;
    venueName?: string;
    ceremonyAddress?: string;
    ceremonyContact?: string;
    ceremonyTime?: string;
    ceremony?: {
      time?: string;
      location?: string;
      [key: string]: unknown;
    };
    galleryImages?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MobileEditableInvitationPageConfig {
  slug: string;
  config: MobileInvitationSeed;
  published: boolean;
  defaultTheme: MobileInvitationThemeKey;
  productTier: MobileInvitationProductTier;
  features: MobileInvitationFeatureFlags;
  hasCustomConfig: boolean;
  dataSource: 'sample' | 'firestore';
  lastSavedAt: string | null;
}

export interface MobileGuestbookComment {
  id: string;
  author: string;
  message: string;
  pageSlug: string;
  createdAt: string | null;
}

export interface MobileInvitationLinks {
  publicUrl: string;
  previewUrls: {
    default: string;
    emotional?: string;
    simple?: string;
    [key: string]: string | undefined;
  };
}

export interface MobileInvitationDashboard {
  page: MobileEditableInvitationPageConfig;
  comments: MobileGuestbookComment[];
  links: MobileInvitationLinks;
}

export interface MobileSessionSummary {
  token: string;
  expiresAt: number;
  pageSlug: string;
}

export interface MobileInvitationCreationInput {
  slugBase: string;
  groomKoreanName: string;
  brideKoreanName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  password: string;
  servicePlan: MobileInvitationProductTier;
  theme: MobileInvitationThemeKey;
}

export interface MobilePageSummary {
  slug: string;
  displayName: string;
  published: boolean;
  productTier: MobileInvitationProductTier;
  defaultTheme: MobileInvitationThemeKey;
  features: MobileInvitationFeatureFlags;
}

export interface MobileInvitationCreationResponse {
  session: MobileSessionSummary;
  page: MobilePageSummary;
  links: MobileInvitationLinks;
}

export interface PendingManageOnboarding {
  pageSlug: string;
  createdAt: number;
}

export interface CreateDraftItem {
  id: string;
  createdAt: string;
  servicePlan: MobileInvitationProductTier;
  theme: MobileInvitationThemeKey;
  pageIdentifier: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  estimatedPrice: number;
  ticketCount: number;
  notes: string;
  status: 'draft';
}
