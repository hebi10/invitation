import type { MobileClientEditorPermissions } from '../../../../src/types/mobileClientEditor';
import type {
  MobileCustomerAuthSession,
  MobileEditableInvitationPageConfig,
  MobileGuestbookComment,
  MobileHighRiskSessionSummary,
  MobileInvitationLinks,
  MobileMusicCategory,
  MobilePageSummary,
  MobileSessionSummary,
} from '../types/mobileInvitation';
import type { MobileBillingProductId } from './mobileBillingProducts';

export interface MobileLoginResponse {
  authenticated: boolean;
  permissions: MobileClientEditorPermissions;
  session: MobileSessionSummary;
  page: MobilePageSummary | null;
  dashboardPage?: MobileEditableInvitationPageConfig | null;
  links: MobileInvitationLinks;
}

export interface MobileSessionResponse {
  authenticated: boolean;
  pageSlug: string | null;
  permissions?: MobileClientEditorPermissions;
  page?: MobilePageSummary | null;
  dashboardPage?: MobileEditableInvitationPageConfig | null;
  links?: MobileInvitationLinks;
}

export interface MobileImageUploadResponse {
  name: string;
  url: string;
  path: string;
  originalUrl?: string;
  originalPath?: string;
  thumbnailUrl: string;
  thumbnailPath: string;
  uploadedAt: string;
}

export interface MobileBase64ImageUploadInput {
  assetKind: 'cover' | 'gallery' | 'favicon' | 'share-preview' | 'kakao-card';
  fileName: string;
  mimeType: string;
  base64: string;
  uploadSessionId: string;
}

export interface MobileImageCleanupResponse {
  success: boolean;
  deletedPaths: string[];
}

export interface MobileMusicLibraryResponse {
  categories: MobileMusicCategory[];
}

export interface MobileBillingPurchaseReceiptInput {
  appUserId: string;
  productId: MobileBillingProductId;
  transactionId: string;
}

export interface MobileCustomerAuthResponse {
  authenticated: boolean;
  session: MobileCustomerAuthSession;
}

export interface MobileHighRiskVerificationResponse {
  verified: boolean;
  session: MobileHighRiskSessionSummary;
}

export interface MobileLinkTokenIssueResponse {
  success: boolean;
  purpose: 'mobile-login';
  expiresAt: string;
  deepLinkUrl: string;
  webFallbackUrl: string;
  revokedExistingCount: number;
}

export interface MobileLinkTokenRevokeResponse {
  success: boolean;
  purpose: 'mobile-login';
  revokedCount: number;
}

export type MobileCommentMutationResponse = {
  success: boolean;
  comment: MobileGuestbookComment | null;
};
