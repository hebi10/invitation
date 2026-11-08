import * as Crypto from 'expo-crypto';
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';

import { INVITATION_PREMIUM_PRICE_LABEL } from './invitationProductPolicy';
import {
  MOBILE_BILLING_PREMIUM_PRICE_KRW,
  MOBILE_BILLING_PRODUCT_IDS,
  type MobileBillingProductId,
} from './mobileBillingProducts';
import { getStoredString, setStoredString } from './storage';

export type MobileBillingPurchaseResult = {
  appUserId: string;
  productIdentifier: MobileBillingProductId;
  transactionIdentifier: string;
  purchaseToken: string;
  purchaseDate: string;
};

type StoreTransaction = {
  productIdentifier: string;
  transactionIdentifier: string;
  purchaseToken: string;
  purchaseDate: string;
};

class BillingNotChargedError extends Error {}

export function isDefinitelyUnchargedBillingError(error: unknown) {
  return error instanceof BillingNotChargedError;
}

const BILLING_APP_USER_ID_STORAGE_KEY = 'mobile-invitation:billing-app-user-id';
let connection: Promise<boolean> | null = null;
let listenersRegistered = false;
let pendingCheckout: {
  productId: MobileBillingProductId;
  resolve: (purchase: Purchase) => void;
  reject: (error: Error) => void;
} | null = null;
let knownPurchases = new Map<string, Purchase>();

function requirePlayDevice() {
  if (Platform.OS !== 'android') {
    throw new BillingNotChargedError('Google Play 결제는 Android 앱에서만 이용할 수 있습니다.');
  }
}

function isPurchased(purchase: Purchase) {
  return purchase.store === 'google' && purchase.purchaseState === 'purchased' &&
    Boolean(purchase.purchaseToken?.trim()) &&
    MOBILE_BILLING_PRODUCT_IDS.includes(purchase.productId as MobileBillingProductId);
}

function trackPurchase(purchase: Purchase) {
  if (isPurchased(purchase)) {
    knownPurchases.set(purchase.purchaseToken!.trim(), purchase);
  }
}

function wireListeners() {
  if (listenersRegistered) return;
  purchaseUpdatedListener((purchase) => {
    trackPurchase(purchase);
    const checkout = pendingCheckout;
    if (!checkout || purchase.productId !== checkout.productId) return;
    if (purchase.purchaseState === 'pending') {
      pendingCheckout = null;
      checkout.reject(new Error('Google Play 결제가 대기 중입니다. 결제 완료 후 복구에서 확인해 주세요.'));
      return;
    }
    if (!isPurchased(purchase)) return;
    pendingCheckout = null;
    checkout.resolve(purchase);
  });
  purchaseErrorListener((error) => {
    const checkout = pendingCheckout;
    if (!checkout) return;
    pendingCheckout = null;
    checkout.reject(error.code === 'user-cancelled'
      ? new BillingNotChargedError('결제를 취소했습니다. 준비가 되면 다시 진행해 주세요.')
      : new Error('Google Play 결제 결과를 확인할 수 없습니다. 추가 결제 전에 복구를 이용해 주세요.'));
  });
  listenersRegistered = true;
}

async function ensurePlayConnection() {
  requirePlayDevice();
  if (!connection) {
    connection = (async () => {
      wireListeners();
      const success = await initConnection();
      if (!success) throw new Error('Google Play 연결을 확인하지 못했습니다.');
      return true;
    })().catch((error) => {
      connection = null;
      throw error;
    });
  }
  await connection;
}

async function resolveAppUserId(preferred?: string | null) {
  const normalized = preferred?.trim() ?? '';
  if (normalized) {
    await setStoredString(BILLING_APP_USER_ID_STORAGE_KEY, normalized);
    return normalized;
  }
  const stored = await getStoredString(BILLING_APP_USER_ID_STORAGE_KEY);
  if (!stored?.trim()) {
    throw new BillingNotChargedError('고객 계정에 로그인한 뒤 결제를 진행해 주세요.');
  }
  return stored.trim();
}

function toTransaction(purchase: Purchase): StoreTransaction {
  const token = purchase.purchaseToken?.trim() ?? '';
  if (!isPurchased(purchase) || !token) {
    throw new Error('Google Play 구매 토큰을 확인할 수 없습니다.');
  }
  return {
    productIdentifier: purchase.productId,
    transactionIdentifier: token,
    purchaseToken: token,
    purchaseDate: new Date(purchase.transactionDate || Date.now()).toISOString(),
  };
}

export async function ensureBillingConfigured(options: { appUserId?: string | null } = {}) {
  await ensurePlayConnection();
  const appUserId = await resolveAppUserId(options.appUserId);
  return { appUserId };
}

export async function getBillingTransactionHistory(options: { appUserId: string }) {
  await ensureBillingConfigured(options);
  const purchases = await getAvailablePurchases();
  const transactions = purchases.filter(isPurchased).map((purchase) => {
    trackPurchase(purchase);
    return toTransaction(purchase);
  });
  return {
    transactions,
    requestDate: new Date().toISOString(),
  };
}

export async function purchaseBillingProduct(
  productId: MobileBillingProductId,
  options: { appUserId?: string | null } = {},
): Promise<MobileBillingPurchaseResult> {
  if (!MOBILE_BILLING_PRODUCT_IDS.includes(productId)) {
    throw new BillingNotChargedError('현재 판매하지 않는 상품입니다.');
  }
  const { appUserId } = await ensureBillingConfigured(options);
  if (pendingCheckout) {
    throw new Error('이미 Google Play 결제 요청이 진행 중입니다.');
  }
  const products = await fetchProducts({ skus: [productId], type: 'in-app' });
  const product = products.find(item => item.id === productId && item.store === 'google');
  if (!product) {
    throw new BillingNotChargedError('Google Play에서 결제 상품을 찾을 수 없습니다. 현재 상품 판매 설정을 확인해 주세요.');
  }
  if (product.currency !== 'KRW' || product.price !== MOBILE_BILLING_PREMIUM_PRICE_KRW) {
    throw new BillingNotChargedError(
      `스토어의 프리미엄 가격이 ${INVITATION_PREMIUM_PRICE_LABEL}으로 확인되지 않아 결제를 중단했습니다.`
    );
  }
  // The one-way user hash lets the server independently bind the paid token to this account.
  const obfuscatedAccountId = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, appUserId);
  const purchase = await new Promise<Purchase>((resolve, reject) => {
    pendingCheckout = { productId, resolve, reject };
    void requestPurchase({
      request: { google: { skus: [productId], obfuscatedAccountId } },
      type: 'in-app',
    }).catch((error: unknown) => {
      const checkout = pendingCheckout;
      if (!checkout || checkout.productId !== productId) return;
      pendingCheckout = null;
      checkout.reject(error instanceof Error ? error : new Error('Google Play 구매 요청을 시작하지 못했습니다.'));
    });
  });
  const transaction = toTransaction(purchase);
  return {
    appUserId,
    productIdentifier: productId,
    transactionIdentifier: transaction.transactionIdentifier,
    purchaseToken: transaction.purchaseToken,
    purchaseDate: transaction.purchaseDate,
  };
}

export async function finishBillingPurchase(purchaseToken: string) {
  await ensurePlayConnection();
  const token = purchaseToken.trim();
  let purchase = knownPurchases.get(token);
  if (!purchase) {
    const available = await getAvailablePurchases();
    available.forEach(trackPurchase);
    purchase = knownPurchases.get(token);
  }
  if (!purchase || !isPurchased(purchase)) {
    throw new Error('구매 완료 처리를 확인하지 못했습니다. 같은 계정으로 다시 복구해 주세요.');
  }
  await finishTransaction({ purchase, isConsumable: true });
  knownPurchases.delete(token);
}

export async function restoreBillingPurchases() {
  await ensurePlayConnection();
  const purchases = await getAvailablePurchases();
  purchases.forEach(trackPurchase);
  return purchases.filter(isPurchased);
}

export async function getBillingAppUserId() {
  return resolveAppUserId();
}
