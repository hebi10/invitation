export const DEFAULT_INVITATION_PRODUCT_TIER = 'premium' as const;
export const INVITATION_PREMIUM_PRICE_KRW = 5000;
export const INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS = 6;
export const INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS = 6;
export const INVITATION_EXTENSION_PRICE_KRW = INVITATION_PREMIUM_PRICE_KRW;
// Historical receipts remain eligible for settlement only if the Play purchase
// predates the billing-policy transition. This does not enable new renewals.
// Keep the cutoff fixed; changing it may change customers' settled rights.
export const LEGACY_MOBILE_PURCHASE_CUTOFF_UTC = '2026-11-09T00:00:00.000Z';
export function isLegacyMobilePurchaseDate(purchaseDate: string | null | undefined) {
  if (typeof purchaseDate !== 'string' || !purchaseDate.trim()) return false;
  const timestamp = Date.parse(purchaseDate);
  return Number.isFinite(timestamp) &&
    timestamp < Date.parse(LEGACY_MOBILE_PURCHASE_CUTOFF_UTC);
}

export const INVITATION_PREMIUM_PRICE_LABEL = `${INVITATION_PREMIUM_PRICE_KRW.toLocaleString('ko-KR')}원`;

export function getInvitationDisplayPeriodEnd(
  startDate: Date,
  months = INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS
) {
  const endDate = new Date(startDate);
  const startDay = endDate.getUTCDate();
  endDate.setUTCMonth(endDate.getUTCMonth() + months + 1, 0);
  endDate.setUTCDate(Math.min(startDay, endDate.getUTCDate()));
  return endDate;
}
