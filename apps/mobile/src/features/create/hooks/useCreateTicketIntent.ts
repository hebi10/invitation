import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

type UseCreateTicketIntentOptions = {
  setNotice: (message: string) => void;
  onOpenTicketPurchase: () => void;
};

export function useCreateTicketIntent({
  setNotice,
  onOpenTicketPurchase,
}: UseCreateTicketIntentOptions) {
  const { ticketIntent } = useLocalSearchParams<{
    ticketIntent?: string | string[];
  }>();
  const normalizedTicketIntent = Array.isArray(ticketIntent) ? ticketIntent[0] : ticketIntent;
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (normalizedTicketIntent !== 'extend') {
      setHandled(false);
      return;
    }
    if (handled) {
      return;
    }

    setNotice('기간 연장에 필요한 티켓 수량을 선택해 주세요.');
    onOpenTicketPurchase();
    setHandled(true);
  }, [handled, normalizedTicketIntent, onOpenTicketPurchase, setNotice]);
}
