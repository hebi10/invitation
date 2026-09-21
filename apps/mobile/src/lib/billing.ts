import { NativeModules, Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import {
  MOBILE_BILLING_PREMIUM_PRICE_KRW,
  MOBILE_BILLING_PRODUCT_IDS,
  type MobileBillingProductId,
} from './mobileBillingProducts';
import { getStoredString, setStoredString } from './storage';

type PurchasesStoreTransaction = {
  productIdentifier: string;
  purchaseDate: string;
  transactionIdentifier: string;
};

type PurchasesCustomerInfo = {
  originalAppUserId: string;
  nonSubscriptionTransactions: PurchasesStoreTransaction[];
};

type PurchasesStoreProduct = {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
};

type PurchasesModule = {
  PRODUCT_CATEGORY?: {
    NON_SUBSCRIPTION?: string;
  };
  LOG_LEVEL?: {
    DEBUG?: string;
  };
  configure: (config: {
    apiKey: string;
    appUserID?: string | null;
  }) => void;
  setLogLevel?: (level: string) => void;
  logIn: (appUserId: string) => Promise<unknown>;
  getProducts: (
    productIdentifiers: string[],
    type?: string
  ) => Promise<PurchasesStoreProduct[]>;
  purchaseStoreProduct: (
    product: PurchasesStoreProduct
  ) => Promise<{
    customerInfo: PurchasesCustomerInfo;
    productIdentifier: string;
    transaction: PurchasesStoreTransaction;
  }>;
  getCustomerInfo: () => Promise<PurchasesCustomerInfo>;
  restorePurchases: () => Promise<PurchasesCustomerInfo>;
  getAppUserID: () => Promise<string>;
};

export type MobileBillingPurchaseResult = {
  appUserId: string;
  customerInfo: PurchasesCustomerInfo;
  productIdentifier: MobileBillingProductId;
  transactionIdentifier: string;
  purchaseDate: string;
};

const BILLING_APP_USER_ID_STORAGE_KEY = 'mobile-invitation:billing-app-user-id';

let billingConfigurationPromise: Promise<{
  purchases: PurchasesModule;
  appUserId: string;
}> | null = null;
let configuredBillingAppUserId: string | null = null;
let billingIdentityQueue: Promise<unknown> = Promise.resolve();

function getRevenueCatApiKey() {
  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';
}

function createBillingAppUserId() {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `mid_${Date.now().toString(36)}_${randomSuffix}`;
}

async function getOrCreateBillingAppUserId(preferredAppUserId?: string | null) {
  const normalizedPreferredAppUserId = preferredAppUserId?.trim() ?? '';
  if (normalizedPreferredAppUserId) {
    await setStoredString(BILLING_APP_USER_ID_STORAGE_KEY, normalizedPreferredAppUserId);
    return normalizedPreferredAppUserId;
  }

  const existing = await getStoredString(BILLING_APP_USER_ID_STORAGE_KEY);
  if (existing?.trim()) {
    return existing.trim();
  }

  const nextAppUserId = createBillingAppUserId();
  await setStoredString(BILLING_APP_USER_ID_STORAGE_KEY, nextAppUserId);
  return nextAppUserId;
}

function loadPurchasesModule(): PurchasesModule | null {
  // 정적 import를 사용해 Metro가 네이티브 결제 SDK를 앱 번들에 포함합니다.
  return Purchases as unknown as PurchasesModule | null;
}

function getBillingUnavailableMessage() {
  if (Platform.OS !== 'android') {
    return 'Google Play 결제는 Android 앱에서만 이용할 수 있습니다.';
  }
  if (!getRevenueCatApiKey().startsWith('goog_')) {
    return 'Google Play 결제 설정을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  }
  return 'Google Play 결제를 시작하지 못했습니다. 스토어에서 설치한 앱을 사용해 주세요.';
}

export async function ensureBillingConfigured(options: { appUserId?: string | null } = {}) {
  if (Platform.OS !== 'android' || !NativeModules.RNPurchases || !getRevenueCatApiKey().startsWith('goog_')) {
    throw new Error(getBillingUnavailableMessage());
  }

  const requestedAppUserId = await getOrCreateBillingAppUserId(options.appUserId);

  if (!billingConfigurationPromise) {
    billingConfigurationPromise = (async () => {
      const purchases = loadPurchasesModule();
      if (!purchases) {
        throw new Error(getBillingUnavailableMessage());
      }

      const apiKey = getRevenueCatApiKey();
      if (!apiKey) {
        throw new Error(getBillingUnavailableMessage());
      }

      if (process.env.NODE_ENV !== 'production' && purchases.LOG_LEVEL?.DEBUG && purchases.setLogLevel) {
        purchases.setLogLevel(purchases.LOG_LEVEL.DEBUG);
      }

      purchases.configure({
        apiKey,
        appUserID: requestedAppUserId,
      });
      configuredBillingAppUserId = requestedAppUserId;

      return {
        purchases,
        appUserId: requestedAppUserId,
      };
    })().catch((error) => {
      billingConfigurationPromise = null;
      configuredBillingAppUserId = null;
      throw error;
    });
  }

  const configured = await billingConfigurationPromise;
  const nextIdentity = billingIdentityQueue.catch(() => undefined).then(async () => {
    if (configuredBillingAppUserId !== requestedAppUserId) {
      await configured.purchases.logIn(requestedAppUserId);
      configuredBillingAppUserId = requestedAppUserId;
    }
    return { purchases: configured.purchases, appUserId: requestedAppUserId };
  });
  billingIdentityQueue = nextIdentity;
  return nextIdentity;
}

export async function fetchBillingProducts(productIds: readonly MobileBillingProductId[]) {
  const { purchases } = await ensureBillingConfigured();
  const type = purchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
  return purchases.getProducts([...productIds], type);
}

export async function purchaseBillingProduct(
  productId: MobileBillingProductId,
  options: { appUserId?: string | null } = {}
) {
  if (!MOBILE_BILLING_PRODUCT_IDS.includes(productId)) {
    throw new Error('현재 판매하지 않는 상품입니다. 프리미엄 상품을 이용해 주세요.');
  }
  const { purchases, appUserId } = await ensureBillingConfigured(options);
  const type = purchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
  const products = await purchases.getProducts([productId], type);
  const targetProduct = products.find((product) => product.identifier === productId);

  if (!targetProduct) {
    throw new Error('Google Play Console 또는 RevenueCat에 결제 상품이 아직 준비되지 않았습니다.');
  }

  if (productId === 'page_creation_premium' &&
      (targetProduct.currencyCode !== 'KRW' || targetProduct.price !== MOBILE_BILLING_PREMIUM_PRICE_KRW)) {
    throw new Error('스토어의 프리미엄 가격이 9,900원으로 확인되지 않아 결제를 중단했습니다. 고객 문의로 확인해 주세요.');
  }

  const purchaseResult = await purchases.purchaseStoreProduct(targetProduct);
  if (purchaseResult.productIdentifier !== productId ||
      !purchaseResult.transaction?.transactionIdentifier?.trim()) {
    throw new Error('Google Play 거래 정보를 확인하지 못했습니다. 고객 문의로 확인해 주세요.');
  }

  return {
    appUserId,
    customerInfo: purchaseResult.customerInfo,
    productIdentifier: purchaseResult.productIdentifier as MobileBillingProductId,
    transactionIdentifier: purchaseResult.transaction.transactionIdentifier,
    purchaseDate: purchaseResult.transaction.purchaseDate,
  } satisfies MobileBillingPurchaseResult;
}

export async function restoreBillingPurchases() {
  const { purchases } = await ensureBillingConfigured();
  return purchases.restorePurchases();
}

export async function getBillingAppUserId() {
  const { purchases, appUserId } = await ensureBillingConfigured();

  try {
    const resolvedAppUserId = await purchases.getAppUserID();
    if (resolvedAppUserId?.trim()) {
      return resolvedAppUserId.trim();
    }
  } catch {
    // noop
  }

  return appUserId;
}
