import type { InvitationPageSeed } from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';

export function buildServerTrustedMobileInvitationPageConfigForSave(
  requestedConfig: InvitationPageSeed,
  currentConfig: InvitationPageSeed
): InvitationPageSeed {
  return sanitizeHeartIconPlaceholdersDeep({
    ...requestedConfig,
    slug: currentConfig.slug,
    eventType: currentConfig.eventType,
    pageData: requestedConfig.pageData || currentConfig.pageData
      ? {
          ...requestedConfig.pageData,
          birthdayTheme: currentConfig.pageData?.birthdayTheme,
          generalEventTheme: currentConfig.pageData?.generalEventTheme,
        }
      : undefined,
    productTier: currentConfig.productTier,
    features: currentConfig.features,
    variants: currentConfig.variants,
  });
}
