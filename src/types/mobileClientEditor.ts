export interface MobileClientEditorPermissions {
  canViewDashboard: boolean;
  canEditInvitation: boolean;
  canManageGuestbook: boolean;
  canUploadImages: boolean;
  canManagePublication: boolean;
  canManageDisplayPeriod: boolean;
  canManageTickets: boolean;
  canIssueLinkToken: boolean;
}

export type MobileClientEditorPermissionKey = keyof MobileClientEditorPermissions;
