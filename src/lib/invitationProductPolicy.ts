export const DEFAULT_INVITATION_PRODUCT_TIER = 'premium' as const;
export const INVITATION_PREMIUM_PRICE_KRW = 5000;
export const INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS = 6;
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
