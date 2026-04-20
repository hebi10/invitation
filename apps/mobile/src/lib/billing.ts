import { Platform } from 'react-native';

import type {
  MobileBillingProductId,
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

function getRevenueCatApiKey() {
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';
  }

  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';
  }

  return '';
}

function createBillingAppUserId() {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `mid_${Date.now().toString(36)}_${randomSuffix}`;
}

async function getOrCreateBillingAppUserId() {
  const existing = await getStoredString(BILLING_APP_USER_ID_STORAGE_KEY);
  if (existing?.trim()) {
    return existing.trim();
  }

  const nextAppUserId = createBillingAppUserId();
  await setStoredString(BILLING_APP_USER_ID_STORAGE_KEY, nextAppUserId);
  return nextAppUserId;
}

function loadPurchasesModule() {
  try {
    const dynamicRequire = Function('return require')() as (id: string) => unknown;
    const purchasesModule = dynamicRequire('react-native-purchases') as
      | PurchasesModule
      | { default?: PurchasesModule };

    if (
      purchasesModule &&
      typeof purchasesModule === 'object' &&
      'default' in purchasesModule &&
      purchasesModule.default
    ) {
      return purchasesModule.default;
    }

    return purchasesModule as PurchasesModule;
  } catch {
    return null;
  }
}

function getBillingUnavailableMessage() {
  if (Platform.OS === 'web') {
    return 'Expo 웹에서는 Google Play Billing을 사용할 수 없습니다.';
  }

  if (!getRevenueCatApiKey()) {
    return 'RevenueCat 공개 API 키가 설정되지 않아 Google Play Billing을 시작할 수 없습니다.';
  }

  return 'react-native-purchases 패키지가 설치되지 않아 Google Play Billing을 사용할 수 없습니다.';
}

export async function ensureBillingConfigured() {
  if (Platform.OS === 'web') {
    throw new Error(getBillingUnavailableMessage());
  }

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

      const appUserId = await getOrCreateBillingAppUserId();

      if (process.env.NODE_ENV !== 'production' && purchases.LOG_LEVEL?.DEBUG && purchases.setLogLevel) {
        purchases.setLogLevel(purchases.LOG_LEVEL.DEBUG);
      }

      purchases.configure({
        apiKey,
        appUserID: appUserId,
      });

      return {
        purchases,
        appUserId,
      };
    })().catch((error) => {
      billingConfigurationPromise = null;
      throw error;
    });
  }

  return billingConfigurationPromise;
}

export async function fetchBillingProducts(productIds: readonly MobileBillingProductId[]) {
  const { purchases } = await ensureBillingConfigured();
  const type = purchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
  return purchases.getProducts([...productIds], type);
}

export async function purchaseBillingProduct(productId: MobileBillingProductId) {
  const { purchases, appUserId } = await ensureBillingConfigured();
  const products = await fetchBillingProducts([productId]);
  const targetProduct = products.find((product) => product.identifier === productId);

  if (!targetProduct) {
    throw new Error('Google Play Console 또는 RevenueCat에 결제 상품이 아직 준비되지 않았습니다.');
  }

  const purchaseResult = await purchases.purchaseStoreProduct(targetProduct);

  return {
    appUserId:
      purchaseResult.customerInfo.originalAppUserId?.trim() || appUserId,
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
