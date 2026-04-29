import type { InvitationProductTier } from './invitationPage';

export type CustomerWalletCreditKind = 'pageCreation' | 'operationTicket';
export type CustomerWalletLedgerDirection = 'credit' | 'debit';
export type CustomerWalletLedgerSource =
  | 'adminGrant'
  | 'mobilePurchase'
  | 'webPurchase'
  | 'eventAssignment'
  | 'migration'
  | 'system';
export type CustomerWalletLedgerPlatform = 'admin' | 'mobile' | 'web' | 'system';

export type CustomerPageCreationCredits = Record<InvitationProductTier, number>;

export interface CustomerWalletLedgerEntry {
  id: string;
  ownerUid: string;
  kind: CustomerWalletCreditKind;
  direction: CustomerWalletLedgerDirection;
  quantity: number;
  tier: InvitationProductTier | null;
  source: CustomerWalletLedgerSource;
  platform: CustomerWalletLedgerPlatform;
  status: 'active' | 'consumed' | 'assigned' | 'revoked' | 'refunded';
  eventId: string | null;
  pageSlug: string | null;
  transactionId: string | null;
  provider: string | null;
  note: string | null;
  createdByUid: string | null;
  createdAt: string | null;
}

export interface CustomerWalletSummary {
  ownerUid: string;
  pageCreationCredits: CustomerPageCreationCredits;
  operationTicketBalance: number;
  updatedAt: string | null;
  recentLedger: CustomerWalletLedgerEntry[];
}

export const EMPTY_CUSTOMER_PAGE_CREATION_CREDITS: CustomerPageCreationCredits = {
  standard: 0,
  deluxe: 0,
  premium: 0,
};
