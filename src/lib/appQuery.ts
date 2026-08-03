export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const THIRTY_MINUTES_MS = 30 * 60 * 1000;
export const GUESTBOOK_STALE_TIME_MS = 15 * 1000;
export const GUESTBOOK_GC_TIME_MS = 10 * 60 * 1000;
export const ADMIN_STALE_TIME_MS = 45 * 1000;
export const ADMIN_GC_TIME_MS = 10 * 60 * 1000;

export const appQueryKeys = {
  invitationPage: (slug: string, scope: 'admin' | 'public' | 'experience') =>
    ['invitation-page', slug, scope] as const,
  guestbookComments: (pageSlug: string) => ['guestbook-comments', pageSlug] as const,
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
  adminCustomerAccounts: ['admin-customer-accounts'] as const,
  demoExperienceSession: ['demo-experience-session'] as const,
  demoExperienceAdmin: (dateKey: string) => ['demo-experience-admin', dateKey] as const,
  demoExperienceEvent: (dateKey: string, slug: string) =>
    ['demo-experience-event', dateKey, slug] as const,
  demoExperienceCustomer: (dateKey: string) =>
    ['demo-experience-customer', dateKey] as const,
} as const;
