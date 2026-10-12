import type { QueryClient } from '@tanstack/react-query';

export const getAdminOwnershipInviteStatusQueryKey = (slug: string) =>
  ['admin-ownership-invite-status', slug] as const;

export function getAdminOwnershipInviteStatusQueryOptions(slug: string, experience: boolean) {
  return {
    queryKey: getAdminOwnershipInviteStatusQueryKey(slug),
    enabled: !experience && Boolean(slug),
  };
}

export function invalidateAdminOwnershipInviteStatus(queryClient: QueryClient, slug: string) {
  return queryClient.invalidateQueries({
    queryKey: getAdminOwnershipInviteStatusQueryKey(slug),
    exact: true,
  });
}
