import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useAuth } from '../../../contexts/AuthContext';
import { usePreferences } from '../../../contexts/PreferencesContext';
import { fulfillMobileBillingPeriodExtension, fulfillMobileBillingTicketPack } from '../../../lib/api';
import { purchaseBillingProduct } from '../../../lib/billing';
import {
  getPendingBillingRequest,
  recoverPendingBillingPurchase,
  runPendingBillingPurchase,
  type PurchaseRequest,
} from '../../../lib/pendingBillingPurchase';
import { MOBILE_BILLING_PAGE_CREATION_PRODUCTS } from '../../../lib/mobileBillingProducts';
import type { LinkedInvitationCard } from '../../../lib/linkedInvitationCards';

type Options = {
  activeLinkedInvitationCard: LinkedInvitationCard | null;
  refreshDashboard: () => Promise<unknown>;
  setNotice: (message: string) => void;
};

export function usePeriodExtensionPurchase({
  activeLinkedInvitationCard,
  refreshDashboard,
  setNotice,
}: Options) {
  const { customerSession, getCustomerIdToken, session } = useAuth();
  const { apiBaseUrl } = usePreferences();
  const processingRef = useRef(false);
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [isPurchasingExtension, setIsPurchasingExtension] = useState(false);
  const [isRecoveringExtension, setIsRecoveringExtension] = useState(false);
  const [pendingExtensionSlug, setPendingExtensionSlug] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    if (!customerSession) { setPendingExtensionSlug(null); return; }
    try {
      const pending = await getPendingBillingRequest({ appUserId: customerSession.uid, apiBaseUrl });
      setPendingExtensionSlug(
        pending?.target.action === 'extendInvitationPeriod' || pending?.target.action === 'grantTicketPack'
          ? pending.target.pageSlug
          : null
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '이전 결제 정보를 확인하지 못했습니다.');
    }
  }, [apiBaseUrl, customerSession, setNotice]);

  useFocusEffect(useCallback(() => {
    void refreshPending();
  }, [refreshPending]));

  const fulfillExtension = useCallback(async (request: PurchaseRequest, receipt: {
    appUserId: string;
    productId: PurchaseRequest['productId'];
    transactionId: string;
  }) => {
    if (request.target.action !== 'extendInvitationPeriod') {
      throw new Error('기간 연장 결제 정보가 올바르지 않습니다.');
    }
    const token = await getCustomerIdToken();
    if (!token || request.appUserId !== customerSession?.uid) {
      throw new Error('결제한 고객 계정으로 로그인해 주세요.');
    }
    return fulfillMobileBillingPeriodExtension(apiBaseUrl, {
      purchase: receipt,
      targetPageSlug: request.target.pageSlug,
      customerIdToken: token,
    });
  }, [apiBaseUrl, customerSession?.uid, getCustomerIdToken]);

  const openExtensionModal = () => {
    setNotice('');
    setExtensionModalVisible(true);
    void refreshPending();
  };
  const closeExtensionModal = () => {
    if (!processingRef.current) setExtensionModalVisible(false);
  };

  const handlePurchaseExtension = async () => {
    if (processingRef.current || !activeLinkedInvitationCard) return;
    if (!customerSession) {
      setNotice('청첩장 소유자 계정으로 먼저 로그인해 주세요.');
      return;
    }
    processingRef.current = true;
    setIsPurchasingExtension(true);
    const productId = MOBILE_BILLING_PAGE_CREATION_PRODUCTS.premium;
    const request: PurchaseRequest = {
      appUserId: customerSession.uid,
      apiBaseUrl,
      productId,
      target: { action: 'extendInvitationPeriod', pageSlug: activeLinkedInvitationCard.slug },
    };
    try {
      const result = await runPendingBillingPurchase(request, {
        purchase: () => purchaseBillingProduct(productId, { appUserId: customerSession.uid }),
        fulfill: (receipt) => fulfillExtension(request, receipt),
      });
      setPendingExtensionSlug(null);
      setExtensionModalVisible(false);
      setNotice(`결제가 확인되어 이용 기간이 6개월 연장되었습니다. 새 종료일: ${new Date(result.endDate).toLocaleDateString('ko-KR')}`);
      await refreshDashboard().catch(() => {
        setNotice('기간 연장은 완료되었습니다. 화면을 새로고침하여 종료일을 확인해 주세요.');
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '기간 연장 결제를 완료하지 못했습니다.');
      await refreshPending();
    } finally {
      processingRef.current = false;
      setIsPurchasingExtension(false);
    }
  };

  const handleRecoverExtension = async () => {
    if (processingRef.current || !customerSession) return;
    processingRef.current = true;
    setIsRecoveringExtension(true);
    try {
      const scope = { appUserId: customerSession.uid, apiBaseUrl };
      const pending = await getPendingBillingRequest(scope);
      if (!pending || !('pageSlug' in pending.target)) {
        throw new Error('복구할 기간 연장 결제가 없습니다.');
      }
      if (pending.target.pageSlug !== activeLinkedInvitationCard?.slug) {
        throw new Error('이전 결제 대상 청첩장을 먼저 열어 주세요.');
      }
      if (pending.target.action === 'grantTicketPack' && session?.pageSlug !== pending.target.pageSlug) {
        throw new Error('이전 결제의 청첩장 연동 정보를 다시 확인해 주세요.');
      }
      await recoverPendingBillingPurchase(scope, async (request, receipt) => {
        if (request.target.action === 'extendInvitationPeriod') {
          return fulfillExtension(request, receipt);
        }
        if (request.target.action === 'grantTicketPack' && session) {
          // Allow settlement of previously charged legacy purchases without selling new tickets.
          return fulfillMobileBillingTicketPack(apiBaseUrl, {
            purchase: receipt,
            targetPageSlug: request.target.pageSlug,
            targetToken: session.token,
          });
        }
        throw new Error('이전 결제의 종류를 확인해 주세요.');
      });
      setPendingExtensionSlug(null);
      setExtensionModalVisible(false);
      setNotice('이전 결제를 확인했습니다. 이용 기간 정보를 새로고침해 주세요.');
      await refreshDashboard().catch(() => undefined);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '이전 결제를 복구하지 못했습니다.');
      await refreshPending();
    } finally {
      processingRef.current = false;
      setIsRecoveringExtension(false);
    }
  };

  return {
    extensionModalVisible,
    isPurchasingExtension,
    isRecoveringExtension,
    pendingExtensionSlug,
    openExtensionModal,
    closeExtensionModal,
    handlePurchaseExtension,
    handleRecoverExtension,
  };
}
