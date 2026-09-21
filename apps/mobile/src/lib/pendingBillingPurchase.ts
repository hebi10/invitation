import type { MobileInvitationCreationInput } from '../types/mobileInvitation';
import type { MobileBillingProductId } from './mobileBillingProducts';
import { getStoredString, setStoredString } from './storage';

export type PurchaseRequest = {
  appUserId: string;
  productId: MobileBillingProductId;
  apiBaseUrl: string;
  target:
    | { action: 'createInvitationPage'; input: MobileInvitationCreationInput }
    | { action: 'grantTicketPack'; pageSlug: string };
};
type Receipt = { appUserId: string; productId: MobileBillingProductId; transactionId: string };
type PendingPurchase = { request: PurchaseRequest; receipt: Receipt };

const STORAGE_KEY = 'mobile-invitation:pending-billing-purchase';
let pendingInMemory: PendingPurchase | null = null;
let isProcessing = false;

function stableJson(value: unknown): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return JSON.stringify(Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, JSON.parse(stableJson(item))])));
  }
  return JSON.stringify(value);
}

async function readPendingPurchase() {
  if (pendingInMemory) return pendingInMemory;
  const saved = await getStoredString(STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as PendingPurchase;
    if (!parsed?.request?.target || !parsed.request.appUserId || !parsed.receipt?.transactionId ||
        parsed.receipt.appUserId !== parsed.request.appUserId || parsed.receipt.productId !== parsed.request.productId) {
      throw new Error('Invalid receipt');
    }
    pendingInMemory = parsed;
    return parsed;
  } catch {
    throw new Error('이전 결제 정보를 확인하지 못했습니다. 추가 결제 전에 고객 문의로 확인해 주세요.');
  }
}

export async function getPendingBillingRequest(scope: { appUserId: string; apiBaseUrl: string }) {
  const pending = await readPendingPurchase();
  if (!pending || pending.request.appUserId !== scope.appUserId || pending.request.apiBaseUrl !== scope.apiBaseUrl) return null;
  // Return a copy: editing the preview must never change the paid target.
  return JSON.parse(JSON.stringify(pending.request)) as PurchaseRequest;
}

export async function recoverPendingBillingPurchase<T>(
  scope: { appUserId: string; apiBaseUrl: string },
  fulfill: (request: PurchaseRequest, receipt: Receipt) => Promise<T>
): Promise<T> {
  const request = await getPendingBillingRequest(scope);
  if (!request) throw new Error('현재 계정에서 이어서 처리할 결제가 없습니다. 결제한 계정으로 로그인해 주세요.');
  return runPendingBillingPurchase(request, {
    purchase: async () => { throw new Error('복구 중에는 새 결제를 진행하지 않습니다.'); },
    fulfill: (receipt) => fulfill(request, receipt),
  });
}

export async function runPendingBillingPurchase<T>(
  request: PurchaseRequest,
  options: {
    purchase: () => Promise<{ appUserId: string; productIdentifier: MobileBillingProductId; transactionIdentifier: string }>;
    fulfill: (receipt: Receipt) => Promise<T>;
    onResume?: () => void;
  }
): Promise<T> {
  if (isProcessing) throw new Error('이미 결제 처리가 진행 중입니다. 잠시 기다려 주세요.');
  isProcessing = true;
  try {
    let pending = await readPendingPurchase();
    if (pending && stableJson(pending.request) !== stableJson(request)) {
      throw new Error('미처리 결제가 있습니다. 이전 계정과 동일한 상품·입력 정보·청첩장으로 다시 시도하거나 고객 문의로 확인해 주세요.');
    }
    if (pending) {
      options.onResume?.();
    } else {
      // Check secure storage before opening Google Play. Do not store auth/session tokens.
      await setStoredString(STORAGE_KEY, null);
      const purchase = await options.purchase();
      pending = {
        request,
        receipt: {
          appUserId: purchase.appUserId,
          productId: purchase.productIdentifier,
          transactionId: purchase.transactionIdentifier,
        },
      };
      pendingInMemory = pending;
    }
    try {
      await setStoredString(STORAGE_KEY, JSON.stringify(pending));
    } catch {
      throw new Error('결제 정보를 기기에 저장하지 못했습니다. 앱을 닫지 말고 같은 정보로 다시 시도하거나 고객 문의로 확인해 주세요. 추가 결제는 진행하지 않습니다.');
    }
    let result: T;
    try {
      result = await options.fulfill(pending.receipt);
      if (result === false) throw new Error('Fulfillment incomplete');
    } catch {
      throw new Error('결제는 완료되었지만 반영을 확인하지 못했습니다. 같은 정보로 다시 시도하면 추가 결제 없이 이어서 처리합니다.');
    }
    // Keep the in-memory receipt if deleting the saved receipt fails, too.
    await setStoredString(STORAGE_KEY, null);
    pendingInMemory = null;
    return result;
  } finally {
    isProcessing = false;
  }
}
