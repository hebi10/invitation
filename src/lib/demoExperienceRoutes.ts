import { getPageWizardCreateHrefForEventType } from '@/app/page-wizard/pageWizardEventConfig';
import { buildEventPreviewPath } from '@/lib/eventPreviewLinks';
import type { EventTypeKey } from '@/lib/eventTypes';
import type { InvitationThemeKey } from '@/types/invitationPage';

export type AppRouteScope = 'production' | 'experience';

export interface AppRoutes {
  home(): string;
  admin(): string;
  customerDashboard(): string;
  wizardCreate(eventType: EventTypeKey): string;
  wizardEdit(slug: string): string;
  wizardResult(slug: string): string;
  preview(slug: string, theme: InvitationThemeKey): string;
}

export function buildAppRoutes(scope: AppRouteScope): AppRoutes {
  if (scope === 'experience') {
    return {
      home: () => '/',
      admin: () => '/experience/admin',
      customerDashboard: () => '/experience/my-invitations',
      wizardCreate: () => '/experience/page-wizard',
      wizardEdit: (slug) => `/experience/page-wizard/${encodeURIComponent(slug)}`,
      wizardResult: (slug) =>
        `/experience/page-wizard/${encodeURIComponent(slug)}/result`,
      preview: (slug, theme) =>
        `/experience/preview/${encodeURIComponent(slug)}/${encodeURIComponent(theme)}`,
    };
  }

  return {
    home: () => '/',
    admin: () => '/admin',
    customerDashboard: () => '/my-invitations',
    wizardCreate: (eventType) => getPageWizardCreateHrefForEventType(eventType),
    wizardEdit: (slug) => `/page-wizard/${encodeURIComponent(slug)}`,
    wizardResult: (slug) => `/page-wizard/${encodeURIComponent(slug)}/result`,
    preview: (slug, theme) => buildEventPreviewPath(slug, 'wedding', theme),
  };
}

