export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const THIRTY_MINUTES_MS = 30 * 60 * 1000;
export const GUESTBOOK_STALE_TIME_MS = 15 * 1000;
export const GUESTBOOK_GC_TIME_MS = 10 * 60 * 1000;
export const ADMIN_STALE_TIME_MS = 45 * 1000;
export const ADMIN_GC_TIME_MS = 10 * 60 * 1000;

export const appQueryKeys = {
  invitationPage: (slug: string, scope: 'admin' | 'public') =>
    ['invitation-page', slug, scope] as const,
  guestbookComments: (pageSlug: string) => ['guestbook-comments', pageSlug] as const,
  guestbookOwnership: (pageSlug: string, uid: string | null) =>
    ['guestbook-ownership', pageSlug, uid] as const,
  ownedCustomerEvents: (uid: string | null) => ['owned-customer-events', uid] as const,
  customerEventGuestbookComments: (pageSlug: string, uid: string | null) =>
    ['customer-event-guestbook-comments', pageSlug, uid] as const,
  customerWallet: (uid: string | null) => ['customer-wallet', uid] as const,
  customerEventOwnership: (pageSlug: string, uid: string | null) =>
    ['customer-event-ownership', pageSlug, uid] as const,
  editableInvitationPage: (pageSlug: string) => ['editable-invitation-page', pageSlug] as const,
  adminDashboardSummary: (recentDays: number) =>
    ['admin-dashboard-summary', recentDays] as const,
  adminInvitationPages: ['admin-invitation-pages'] as const,
  adminComments: ['admin-comments'] as const,
  adminClientPasswords: ['admin-client-passwords'] as const,
  adminCustomerAccounts: ['admin-customer-accounts'] as const,
} as const;
