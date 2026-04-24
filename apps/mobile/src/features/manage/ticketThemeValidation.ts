import { INVITATION_THEME_KEYS } from '../../lib/invitationThemes';
import type { MobileInvitationThemeKey } from '../../types/mobileInvitation';

export type TicketThemeAvailabilityMap = Partial<
  Record<MobileInvitationThemeKey, { available?: boolean }>
>;

export function resolveAvailableTicketThemes(options: {
  defaultTheme: MobileInvitationThemeKey;
  linkedThemeKeys: readonly MobileInvitationThemeKey[];
  dashboardVariants?: TicketThemeAvailabilityMap;
}) {
  const themeSet = new Set<MobileInvitationThemeKey>([
    options.defaultTheme,
    ...options.linkedThemeKeys,
  ]);

  INVITATION_THEME_KEYS.forEach((themeKey) => {
    if (options.dashboardVariants?.[themeKey]?.available === true) {
      themeSet.add(themeKey);
    }
  });

  return INVITATION_THEME_KEYS.filter((themeKey) => themeSet.has(themeKey));
}

export function resolvePreferredTargetTheme(
  currentTheme: MobileInvitationThemeKey,
  availableThemes: readonly MobileInvitationThemeKey[],
  purchasableThemes: readonly MobileInvitationThemeKey[]
) {
  const availableThemeSet = new Set<MobileInvitationThemeKey>(availableThemes);

  return (
    purchasableThemes.find(
      (themeKey) => themeKey !== currentTheme && availableThemeSet.has(themeKey)
    ) ??
    purchasableThemes.find((themeKey) => !availableThemeSet.has(themeKey)) ??
    purchasableThemes.find((themeKey) => themeKey === currentTheme) ??
    purchasableThemes[0] ??
    currentTheme
  );
}

export function getSelectedTargetThemeState(options: {
  currentTheme: MobileInvitationThemeKey;
  selectedTargetTheme: MobileInvitationThemeKey;
  availableThemes: readonly MobileInvitationThemeKey[];
}) {
  const { currentTheme, selectedTargetTheme, availableThemes } = options;
  const isSelectedTargetThemeCurrent = selectedTargetTheme === currentTheme;
  const isSelectedTargetThemeAvailable = availableThemes.includes(selectedTargetTheme);

  return {
    isSelectedTargetThemeCurrent,
    isSelectedTargetThemeAvailable,
    canApplyThemeChange:
      !isSelectedTargetThemeCurrent && isSelectedTargetThemeAvailable,
    canPurchaseTargetTheme:
      !isSelectedTargetThemeCurrent && !isSelectedTargetThemeAvailable,
  };
}
