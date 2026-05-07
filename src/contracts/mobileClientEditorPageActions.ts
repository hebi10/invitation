import type { MobileClientEditorPermissionKey } from '../types/mobileClientEditor';

export const MOBILE_CLIENT_EDITOR_PAGE_ACTIONS = {
  save: 'save',
  restore: 'restore',
  setPublished: 'setPublished',
  setVariantAvailability: 'setVariantAvailability',
  adjustTicketCount: 'adjustTicketCount',
  extendDisplayPeriod: 'extendDisplayPeriod',
  setDisplayPeriod: 'setDisplayPeriod',
  transferTicketCount: 'transferTicketCount',
} as const;

export type MobileClientEditorPageAction =
  (typeof MOBILE_CLIENT_EDITOR_PAGE_ACTIONS)[keyof typeof MOBILE_CLIENT_EDITOR_PAGE_ACTIONS];

export const MOBILE_CLIENT_EDITOR_PAGE_ACTION_REQUIRED_PERMISSIONS = {
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.save]: 'canEditInvitation',
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.restore]: 'canEditInvitation',
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.setPublished]: 'canManagePublication',
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.setVariantAvailability]: 'canManagePublication',
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.adjustTicketCount]: 'canManageTickets',
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.extendDisplayPeriod]: 'canManageDisplayPeriod',
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.setDisplayPeriod]: 'canManageDisplayPeriod',
  [MOBILE_CLIENT_EDITOR_PAGE_ACTIONS.transferTicketCount]: 'canManageTickets',
} as const satisfies Record<MobileClientEditorPageAction, MobileClientEditorPermissionKey>;

export function isMobileClientEditorPageAction(
  value: unknown
): value is MobileClientEditorPageAction {
  return (
    typeof value === 'string' &&
    Object.values(MOBILE_CLIENT_EDITOR_PAGE_ACTIONS).includes(
      value as MobileClientEditorPageAction
    )
  );
}
