import 'server-only';

import { listRecentVoidedGooglePlayPurchases } from './googlePlayPurchaseVerifier';
import { firestoreBillingFulfillmentRepository } from './repositories/billingFulfillmentRepository';

/** Voided purchases require explicit review: ownership may have changed after payment. */
export async function getAdminVoidedPurchaseReview(
  dependencies = {
    list: listRecentVoidedGooglePlayPurchases,
    find: (id: string) => firestoreBillingFulfillmentRepository.findByTransactionId(id),
  }
) {
  const purchases = await dependencies.list();
  const records = [];
  // Bounded concurrent Firestore reads; a failed lookup must not be reported as an unmatched purchase.
  for (let offset = 0; offset < purchases.length; offset += 10) {
    const chunk = purchases.slice(offset, offset + 10);
    const mapped = await Promise.all(chunk.map(async purchase => {
      const grant = await dependencies.find(purchase.transactionIdentifier);
      return {
        ...purchase,
        fulfillmentStatus: grant?.provider === 'googleplay' ? grant.status : null,
        kind: grant?.provider === 'googleplay' ? grant.kind : null,
        pageSlug: grant?.provider === 'googleplay' ? grant.createdPageSlug ?? grant.targetPageSlug : null,
        eventId: grant?.provider === 'googleplay' ? grant.eventId ?? null : null,
        reviewRequired: true,
      };
    }));
    records.push(...mapped);
  }
  return { windowDays: 30, count: records.length, records };
}
