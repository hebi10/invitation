import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useAuth } from '../../../contexts/AuthContext';
import { usePreferences } from '../../../contexts/PreferencesContext';
import { fulfillMobileBillingPeriodExtension, fulfillMobileBillingTicketPack } from '../../../lib/api';
import {
  getPendingBillingRequest,
  recoverPendingBillingPurchase,
  type PurchaseRequest,
} from '../../../lib/pendingBillingPurchase';
import type { LinkedInvitationCard } from '../../../lib/linkedInvitationCards';

type Options = {
  activeLinkedInvitationCard: LinkedInvitationCard | null;
  refreshDashboard: () => Promise<unknown>;
  setNotice: (message: string) => void;
};

// This hook recovers previously charged transactions only.
// New invitation purchases remain exclusively in the create flow.
export function usePeriodExtensionPurchase({
  activeLinkedInvitationCard,
  refreshDashboard,
  setNotice,
}: Options) {
  const { customerSession, getCustomerIdToken, session } = useAuth();
  const { apiBaseUrl } = usePreferences();
  const processingRef = useRef(false);
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [isRecoveringExtension, setIsRecoveringExtension] = useState(false);
  const [pendingExtensionSlug, setPendingExtensionSlug] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    if (!customerSession) {
      setPendingExtensionSlug(null);
      return;
    }
    try {
      const pending = await getPendingBillingRequest({
        appUserId: customerSession.uid,
        apiBaseUrl,
      });
      setPendingExtensionSlug(
        pending?.target.action === 'extendInvitationPeriod' ||
        pending?.target.action === 'grantTicketPack'
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

  const fulfillLegacyExtension = useCallback(async (
    request: PurchaseRequest,
    receipt: { appUserId: string; productId: PurchaseRequest['productId']; transactionId: string }
  ) => {
    if (request.target.action !== 'extendInvitationPeriod') {
      throw new Error('이전 결제 정보가 올바르지 않습니다.');
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
    if (!pendingExtensionSlug) return;
    setNotice('');
    setExtensionModalVisible(true);
    void refreshPending();
  };
  const closeExtensionModal = () => {
    if (!processingRef.current) setExtensionModalVisible(false);
  };

  const handleRecoverExtension = async () => {
    if (processingRef.current || !customerSession) return;
    processingRef.current = true;
    setIsRecoveringExtension(true);
    try {
      const scope = { appUserId: customerSession.uid, apiBaseUrl };
      const pending = await getPendingBillingRequest(scope);
      if (!pending || !('pageSlug' in pending.target)) {
        throw new Error('복구할 기존 결제가 없습니다.');
      }
      if (pending.target.pageSlug !== activeLinkedInvitationCard?.slug) {
        throw new Error('이전 결제 대상 청첩장을 먼저 열어 주세요.');
      }
      if (pending.target.action === 'grantTicketPack' &&
          session?.pageSlug !== pending.target.pageSlug) {
        throw new Error('이전 결제의 청첩장 연동 정보를 다시 확인해 주세요.');
      }
      await recoverPendingBillingPurchase(scope, async (request, receipt) => {
        if (request.target.action === 'extendInvitationPeriod') {
          return fulfillLegacyExtension(request, receipt);
        }
        if (request.target.action === 'grantTicketPack' && session) {
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
      setNotice(
        pending.target.action === 'grantTicketPack'
          ? '기존 결제 처리를 확인했습니다. 잔여 이용 권리는 고객 지원을 통해 확인해 주세요.'
          : '기존 결제 처리를 확인했습니다. 새로고침 후 이용 기간을 확인해 주세요.'
      );
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
    isRecoveringExtension,
    pendingExtensionSlug,
    openExtensionModal,
    closeExtensionModal,
    handleRecoverExtension,
  };
}
