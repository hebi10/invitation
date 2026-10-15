import type { InvitationPageSeed } from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';
import { isRecord } from '@/lib/invitationPageNormalization';

export function buildServerTrustedMobileInvitationPageConfigForSave(
  requestedConfig: InvitationPageSeed,
  currentConfig: InvitationPageSeed
): InvitationPageSeed {
  const currentOverrides: Record<string, unknown> = isRecord(currentConfig.pageData?.themeOverrides) ? currentConfig.pageData.themeOverrides : {};
  const requestedOverrides: Record<string, unknown> = isRecord(requestedConfig.pageData?.themeOverrides) ? requestedConfig.pageData.themeOverrides : {};
  const protectedThemes = Object.keys(currentOverrides).filter((theme) => {
    const current = currentOverrides[theme];
    return isRecord(current) && current.weddingCover !== undefined;
  });
  const themes = [...new Set([...Object.keys(requestedOverrides), ...protectedThemes])];
  const themeOverrides = themes.length || isRecord(requestedConfig.pageData?.themeOverrides) ? Object.fromEntries(themes.map((theme) => {
    const current = isRecord(currentOverrides[theme]) ? currentOverrides[theme] : {};
    const requested = isRecord(requestedOverrides[theme]) ? requestedOverrides[theme] : {};
    const editableFields = Object.fromEntries(Object.entries(requested).filter(([key]) => key !== 'weddingCover'));
    return [theme, {
      ...editableFields,
      ...(current.weddingCover !== undefined ? { weddingCover: current.weddingCover } : {}),
    }];
  })) : undefined;

  return sanitizeHeartIconPlaceholdersDeep({
    ...requestedConfig,
    slug: currentConfig.slug,
    eventType: currentConfig.eventType,
    pageData: requestedConfig.pageData || currentConfig.pageData
      ? {
          ...requestedConfig.pageData,
          weddingCover: currentConfig.pageData?.weddingCover,
          themeOverrides,
          birthdayTheme: currentConfig.pageData?.birthdayTheme,
          generalEventTheme: currentConfig.pageData?.generalEventTheme,
        }
      : undefined,
    productTier: currentConfig.productTier,
    features: currentConfig.features,
    variants: currentConfig.variants,
  });
}
