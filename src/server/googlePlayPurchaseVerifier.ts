import 'server-only';

import { createHash } from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';

const PACKAGE_NAME = 'kr.msgnote.mobileinvitation';
const GOOGLE_PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const MAX_TOKEN_LENGTH = 4096;

export type GooglePlayPurchaseReceipt = {
  appUserId: string;
  productId: string;
  transactionId: string;
  purchaseToken?: string;
};

export type VerifiedGooglePlayTransaction = {
  transactionIdentifier: string;
  productIdentifier: string;
  purchaseDate: string;
  purchaseTokenHash: string;
  alreadyConsumed: boolean;
};

type ProductPurchaseV2 = {
  purchaseStateContext?: { purchaseState?: string };
  productLineItem?: Array<{
    productId?: string;
    productOfferDetails?: {
      quantity?: number;
      refundableQuantity?: number;
      consumptionState?: string;
    };
  }>;
  purchaseCompletionTime?: string;
  orderId?: string;
  obfuscatedExternalAccountId?: string;
};

function serverCredentials() {
  const encoded = process.env.GOOGLE_PLAY_BILLING_SERVICE_ACCOUNT_JSON?.trim();
  if (!encoded) return undefined;
  try {
    const value: unknown = JSON.parse(encoded);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, string>;
    }
  } catch {
    // A malformed credential must fail closed without revealing its contents.
  }
  throw new Error('Google Play billing server credentials are invalid.');
}

function accessToken() {
  const credentials = serverCredentials();
  const auth = new GoogleAuth({
    scopes: [GOOGLE_PLAY_SCOPE],
    ...(credentials ? { credentials } : {}),
  });
  return auth.getAccessToken();
}

export function googlePlayPurchaseTokenHash(purchaseToken: string) {
  return createHash('sha256').update(purchaseToken, 'utf8').digest('hex');
}

export function googlePlayObfuscatedAccountId(appUserId: string) {
  return createHash('sha256').update(appUserId, 'utf8').digest('hex');
}

export function interpretGooglePlayPurchase(
  response: ProductPurchaseV2,
  purchase: GooglePlayPurchaseReceipt,
  options: { allowConsumed?: boolean } = {},
): VerifiedGooglePlayTransaction {
  if (response.purchaseStateContext?.purchaseState !== 'PURCHASED') {
    throw new Error('The Google Play purchase could not be verified yet.');
  }

  const items = response.productLineItem;
  if (!Array.isArray(items) || items.length !== 1 || items[0]?.productId !== purchase.productId) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }
  const details = items[0].productOfferDetails;
  if (details?.quantity !== undefined && details.quantity !== 1) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }
  if (details?.refundableQuantity !== 1 ||
      (details.consumptionState !== 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' &&
       details.consumptionState !== 'CONSUMPTION_STATE_CONSUMED')) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }
  const alreadyConsumed = details.consumptionState === 'CONSUMPTION_STATE_CONSUMED';
  if (alreadyConsumed && !options.allowConsumed) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }
  const purchaseDate = response.purchaseCompletionTime;
  if (!purchaseDate || !Number.isFinite(Date.parse(purchaseDate))) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }

  // A new purchase must be bound to the Firebase customer who paid.
  if (response.obfuscatedExternalAccountId !== googlePlayObfuscatedAccountId(purchase.appUserId)) {
    throw Object.assign(new Error('결제한 계정과 현재 로그인 계정이 다릅니다. 고객 문의로 확인해 주세요.'), {
      code: 'billing-fulfillment-requires-review',
    });
  }

  const purchaseTokenHash = googlePlayPurchaseTokenHash(purchase.purchaseToken!);
  const orderId = response.orderId?.trim();
  // One token must always resolve to one fulfillment, even when Google changes order ID metadata.
  const transactionIdentifier = `play_${purchaseTokenHash}`;
  if (purchase.transactionId && purchase.transactionId !== transactionIdentifier &&
      purchase.transactionId !== purchase.purchaseToken && purchase.transactionId !== orderId) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }

  return {
    transactionIdentifier,
    productIdentifier: purchase.productId,
    purchaseDate: new Date(purchaseDate).toISOString(),
    purchaseTokenHash,
    alreadyConsumed,
  };
}

export async function verifyGooglePlayOneTimePurchase(
  purchase: GooglePlayPurchaseReceipt,
  options: { allowConsumed?: boolean } = {},
): Promise<VerifiedGooglePlayTransaction> {
  const token = purchase.purchaseToken?.trim() ?? '';
  if (!token || token.length > MAX_TOKEN_LENGTH || /\s/.test(token) ||
      purchase.transactionId.startsWith('mock_') || !purchase.appUserId.trim()) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }
  const oauth = await accessToken().catch(() => null);
  if (!oauth) {
    throw new Error('Google Play server purchase verification is not configured.');
  }
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/productsv2/tokens/${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${oauth}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!response?.ok) {
    throw new Error('Google Play purchase verification failed.');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The Google Play purchase could not be verified yet.');
  }
  return interpretGooglePlayPurchase(payload as ProductPurchaseV2, {
    ...purchase,
    purchaseToken: token,
  }, options);
}

export type VoidedPlayPurchase = {
  transactionIdentifier: string;
  voidedAt: string;
  reason: number | null;
  source: number | null;
};

/** Read-only reconciliation. Never return raw purchase tokens or log upstream responses. */
export async function listRecentVoidedGooglePlayPurchases(): Promise<VoidedPlayPurchase[]> {
  const oauth = await accessToken().catch(() => null);
  if (!oauth) throw new Error('Google Play refund verification is not configured.');
  const purchases = new Map<string, VoidedPlayPurchase>();
  const seenTokens = new Set<string>();
  let nextToken: string | null = null;
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ type: '0', maxResults: '100' });
    if (nextToken) query.set('token', nextToken);
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/voidedpurchases?${query}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${oauth}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (!response?.ok) throw new Error('Google Play refund verification failed.');
    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Invalid Google Play refund response.');
    }
    const data = payload as { voidedPurchases?: unknown; tokenPagination?: { nextPageToken?: unknown } };
    if (data.voidedPurchases !== undefined && !Array.isArray(data.voidedPurchases)) {
      throw new Error('Invalid Google Play refund response.');
    }
    for (const item of (data.voidedPurchases ?? []) as unknown[]) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid Google Play refund record.');
      const value = item as Record<string, unknown>;
      const token = typeof value.purchaseToken === 'string' ? value.purchaseToken : '';
      const millis = typeof value.voidedTimeMillis === 'string' && /^\d+$/.test(value.voidedTimeMillis)
        ? Number(value.voidedTimeMillis) : NaN;
      if (!token || token.length > MAX_TOKEN_LENGTH || /\s/.test(token) ||
          !Number.isSafeInteger(millis) || !Number.isFinite(new Date(millis).getTime())) {
        throw new Error('Invalid Google Play refund record.');
      }
      const transactionIdentifier = `play_${googlePlayPurchaseTokenHash(token)}`;
      const voidedAt = new Date(millis).toISOString();
      const prior = purchases.get(transactionIdentifier);
      if (!prior || prior.voidedAt < voidedAt) {
        purchases.set(transactionIdentifier, {
          transactionIdentifier,
          voidedAt,
          reason: typeof value.voidedReason === 'number' && Number.isInteger(value.voidedReason) ? value.voidedReason : null,
          source: typeof value.voidedSource === 'number' && Number.isInteger(value.voidedSource) ? value.voidedSource : null,
        });
      }
    }
    const token = data.tokenPagination?.nextPageToken;
    if (token === undefined || token === null || token === '') return [...purchases.values()];
    if (typeof token !== 'string' || token.length > 4096 || seenTokens.has(token)) {
      throw new Error('Invalid Google Play refund pagination.');
    }
    seenTokens.add(token);
    nextToken = token;
  }
  throw new Error('Google Play refund scan exceeded its safe page limit.');
}
