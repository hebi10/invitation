import type { MobileInvitationThemeKey as SharedMobileInvitationThemeKey } from '../lib/invitationThemes';
import type { MobileClientEditorPermissions } from '../../../../src/types/mobileClientEditor';
import type {
  GuestbookCommentAction as SharedGuestbookCommentAction,
  GuestbookCommentStatus as SharedGuestbookCommentStatus,
} from '../../../../src/lib/guestbookComments';

export type MobileInvitationProductTier = 'standard' | 'deluxe' | 'premium';
export type MobileInvitationThemeKey = SharedMobileInvitationThemeKey;
export type MobileGuestbookCommentAction = SharedGuestbookCommentAction;
export type MobileGuestbookCommentStatus = SharedGuestbookCommentStatus;

export interface MobileInvitationVariantLink {
  available: boolean;
  path: string;
  displayName: string;
}

export interface MobileInvitationFeatureFlags {
  maxGalleryImages: number;
  shareMode: 'link' | 'card' | 'none';
  showMusic: boolean;
  showCountdown: boolean;
  showGuestbook: boolean;
}

export interface MobileMusicTrack {
  id: string;
  categoryId: string;
  title: string;
  artist: string;
  storagePath: string;
  active: boolean;
}

export interface MobileMusicCategory {
  id: string;
  label: string;
  tracks: MobileMusicTrack[];
}

export interface MobileKakaoAddressSearchResult {
  query: string;
  addressName: string;
  latitude: number;
  longitude: number;
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

export interface MobileInvitationCeremonyData {
  time?: string;
  location?: string;
}

export interface MobileInvitationGuideItem {
  title: string;
  content: string;
}

export interface MobileInvitationAccountItem {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

export interface MobileInvitationGiftInfo {
  message?: string;
  groomAccounts?: MobileInvitationAccountItem[];
  brideAccounts?: MobileInvitationAccountItem[];
}

export interface MobileInvitationKakaoMapData {
  latitude?: number;
  longitude?: number;
  level?: number;
  markerTitle?: string;
}

export interface MobileInvitationPageData {
  subtitle?: string;
  venueName?: string;
  ceremonyAddress?: string;
  ceremonyContact?: string;
  ceremonyTime?: string;
  mapDescription?: string;
  mapUrl?: string;
  greetingMessage?: string;
  greetingAuthor?: string;
  coverImageThumbnailUrl?: string;
  galleryImageThumbnailUrls?: string[];
  ceremony?: MobileInvitationCeremonyData;
  reception?: MobileInvitationCeremonyData;
  groom?: MobileInvitationPerson;
  bride?: MobileInvitationPerson;
  galleryImages?: string[];
  kakaoMap?: MobileInvitationKakaoMapData;
  venueGuide?: MobileInvitationGuideItem[];
  wreathGuide?: MobileInvitationGuideItem[];
  giftInfo?: MobileInvitationGiftInfo;
}

export interface MobileInvitationMetadataImages {
  wedding?: string;
  social?: string;
  kakaoCard?: string;
  favicon?: string;
}

export interface MobileInvitationMetadataText {
  title?: string;
  description?: string;
}

export interface MobileInvitationMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  images?: MobileInvitationMetadataImages;
  openGraph?: MobileInvitationMetadataText;
  twitter?: MobileInvitationMetadataText;
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
  pageData?: MobileInvitationPageData;
  metadata?: MobileInvitationMetadata;
  musicStoragePath?: string;
  variants?: Partial<Record<MobileInvitationThemeKey, MobileInvitationVariantLink>>;
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
  status: MobileGuestbookCommentStatus;
  createdAt: string | null;
  hiddenAt: string | null;
  deletedAt: string | null;
  scheduledDeleteAt: string | null;
  restoredAt: string | null;
}

export interface MobileInvitationLinks {
  publicUrl: string;
  previewUrls: {
    default: string;
  } & Partial<Record<MobileInvitationThemeKey, string>>;
}

export interface MobileDisplayPeriodSummary {
  enabled: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface MobileInvitationDashboard {
  page: MobileEditableInvitationPageConfig;
  comments: MobileGuestbookComment[];
  commentCount: number;
  commentsIncluded: boolean;
  permissions: MobileClientEditorPermissions;
  links: MobileInvitationLinks;
  ticketCount: number;
  displayPeriod: MobileDisplayPeriodSummary;
}

export interface MobileSessionSummary {
  token: string;
  expiresAt: number;
  pageSlug: string;
}

export interface MobileHighRiskSessionSummary {
  token: string;
  expiresAt: number;
  verifiedAt: number;
  pageSlug: string;
}

export interface MobileCustomerAuthSession {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  uid: string;
  email: string;
  displayName: string | null;
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

export type MobileInvitationSlugAvailabilityReason =
  | 'ok'
  | 'taken'
  | 'required'
  | 'invalid'
  | 'too_short'
  | 'too_long'
  | 'reserved';

export interface MobileInvitationSlugAvailabilityResponse {
  normalizedSlugBase: string;
  available: boolean;
  reason: MobileInvitationSlugAvailabilityReason;
}

export interface MobilePageSummary {
  slug: string;
  displayName: string;
  published: boolean;
  productTier: MobileInvitationProductTier;
  defaultTheme: MobileInvitationThemeKey;
  features: MobileInvitationFeatureFlags;
  ticketCount: number;
  displayPeriod: MobileDisplayPeriodSummary;
}

export interface MobileInvitationCreationResponse {
  permissions: MobileClientEditorPermissions;
  session: MobileSessionSummary;
  page: MobilePageSummary;
  dashboardPage?: MobileEditableInvitationPageConfig | null;
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
  groomEnglishName?: string;
  brideEnglishName?: string;
  weddingDate: string;
  venue: string;
  estimatedPrice: number;
  ticketCount: number;
  notes: string;
  status: 'draft';
}
