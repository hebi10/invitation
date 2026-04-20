export type MobileBillingProductTier = 'standard' | 'deluxe' | 'premium';

export const MOBILE_BILLING_PAGE_CREATION_PRODUCTS = {
  standard: 'page_creation_standard',
  deluxe: 'page_creation_deluxe',
  premium: 'page_creation_premium',
} as const satisfies Record<MobileBillingProductTier, string>;

export const MOBILE_BILLING_TICKET_PACK_PRODUCTS = {
  1: 'ticket_pack_1',
  3: 'ticket_pack_3',
  6: 'ticket_pack_6',
} as const;

export const MOBILE_BILLING_TICKET_PACK_COUNTS = [1, 3, 6] as const;

export type MobileBillingPageCreationProductId =
  (typeof MOBILE_BILLING_PAGE_CREATION_PRODUCTS)[MobileBillingProductTier];
export type MobileBillingTicketPackCount =
  (typeof MOBILE_BILLING_TICKET_PACK_COUNTS)[number];
export type MobileBillingTicketPackProductId =
  (typeof MOBILE_BILLING_TICKET_PACK_PRODUCTS)[MobileBillingTicketPackCount];
export type MobileBillingProductId =
  | MobileBillingPageCreationProductId
  | MobileBillingTicketPackProductId;

export type MobileBillingProductDefinition =
  | {
      kind: 'pageCreation';
      productId: MobileBillingPageCreationProductId;
      productTier: MobileBillingProductTier;
    }
  | {
      kind: 'ticketPack';
      productId: MobileBillingTicketPackProductId;
      ticketCount: MobileBillingTicketPackCount;
    };

export const MOBILE_BILLING_PAGE_CREATION_PRODUCT_IDS = Object.values(
  MOBILE_BILLING_PAGE_CREATION_PRODUCTS
) as MobileBillingPageCreationProductId[];

export const MOBILE_BILLING_TICKET_PACK_PRODUCT_IDS = MOBILE_BILLING_TICKET_PACK_COUNTS.map(
  (count) => MOBILE_BILLING_TICKET_PACK_PRODUCTS[count]
) as MobileBillingTicketPackProductId[];

export const MOBILE_BILLING_PRODUCT_IDS = [
  ...MOBILE_BILLING_PAGE_CREATION_PRODUCT_IDS,
  ...MOBILE_BILLING_TICKET_PACK_PRODUCT_IDS,
] as const satisfies readonly MobileBillingProductId[];

const mobileBillingProductDefinitions = [
  ...(
    Object.entries(MOBILE_BILLING_PAGE_CREATION_PRODUCTS) as Array<
      [MobileBillingProductTier, MobileBillingPageCreationProductId]
    >
  ).map(
    ([productTier, productId]) =>
      ({
        kind: 'pageCreation',
        productId,
        productTier,
      }) satisfies MobileBillingProductDefinition
  ),
  ...MOBILE_BILLING_TICKET_PACK_COUNTS.map(
    (ticketCount) =>
      ({
        kind: 'ticketPack',
        productId: MOBILE_BILLING_TICKET_PACK_PRODUCTS[ticketCount],
        ticketCount,
      }) satisfies MobileBillingProductDefinition
  ),
] as const satisfies readonly MobileBillingProductDefinition[];

const mobileBillingProductDefinitionById = Object.fromEntries(
  mobileBillingProductDefinitions.map((entry) => [entry.productId, entry])
) as Record<MobileBillingProductId, MobileBillingProductDefinition>;

export function isMobileBillingProductId(value: unknown): value is MobileBillingProductId {
  return (
    typeof value === 'string' &&
    MOBILE_BILLING_PRODUCT_IDS.includes(value as MobileBillingProductId)
  );
}

export function getMobileBillingProductDefinition(
  productId: MobileBillingProductId
) {
  return mobileBillingProductDefinitionById[productId];
}

export function getMobileBillingPageCreationProductId(
  productTier: MobileBillingProductTier
) {
  return MOBILE_BILLING_PAGE_CREATION_PRODUCTS[productTier];
}

export function getMobileBillingTicketPackProductId(
  ticketCount: MobileBillingTicketPackCount
) {
  return MOBILE_BILLING_TICKET_PACK_PRODUCTS[ticketCount];
}

export function isMobileBillingTicketPackCount(
  value: number
): value is MobileBillingTicketPackCount {
  return MOBILE_BILLING_TICKET_PACK_COUNTS.includes(
    value as MobileBillingTicketPackCount
  );
}
