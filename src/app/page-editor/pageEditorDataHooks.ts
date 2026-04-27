import { useQuery } from '@tanstack/react-query';

import {
  getCustomerEditableInvitationPageState,
  getCustomerEventOwnershipStatus,
} from '@/services/customerEventService';
import { getEditableInvitationPageConfig } from '@/services/invitationPageService';
import {
  appQueryKeys,
  FIFTEEN_MINUTES_MS,
  THIRTY_MINUTES_MS,
} from '@/lib/appQuery';

export type EditablePageEditorConfig = Awaited<
  ReturnType<typeof getEditableInvitationPageConfig>
>;

interface PageEditorAccessQueryOptions {
  slug: string;
  authUserUid: string | null | undefined;
  isAdminLoading: boolean;
  isAdminLoggedIn: boolean;
  isLoggedIn: boolean;
}

export function usePageEditorAccessQueries({
  slug,
  authUserUid,
  isAdminLoading,
  isAdminLoggedIn,
  isLoggedIn,
}: PageEditorAccessQueryOptions) {
  const ownershipQuery = useQuery({
    queryKey: appQueryKeys.customerEventOwnership(slug, authUserUid ?? null),
    enabled: !isAdminLoading && !isAdminLoggedIn && isLoggedIn,
    queryFn: async () => getCustomerEventOwnershipStatus(slug, authUserUid),
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnWindowFocus: false,
  });

  const configQuery = useQuery({
    queryKey: appQueryKeys.editableInvitationPage(slug),
    enabled:
      !isAdminLoading && (isAdminLoggedIn || ownershipQuery.data?.status === 'owner'),
    queryFn: async () => {
      if (isAdminLoggedIn) {
        return getEditableInvitationPageConfig(slug);
      }

      const customerState = await getCustomerEditableInvitationPageState(slug);
      if (customerState.status === 'ready') {
        return customerState.editableConfig;
      }

      if (customerState.status === 'blocked') {
        throw new Error(customerState.message);
      }

      return null;
    },
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnWindowFocus: false,
  });

  return { ownershipQuery, configQuery };
}
