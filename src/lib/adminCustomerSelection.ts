type CustomerIdentity = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  disabled?: boolean;
  isAdmin?: boolean;
  missingAuthUser?: boolean;
};

export function getCustomerAssignmentConfirmation(
  accounts: readonly CustomerIdentity[],
  uid: string,
  eventName: string,
  slug: string
) {
  const account = accounts.find((candidate) => candidate.uid === uid);
  if (!uid || !account || account.disabled || account.isAdmin || account.missingAuthUser) return null;
  const identity = [account.displayName?.trim(), account.email?.trim()].filter(Boolean).join(' · ') || account.uid;
  return `${identity}\n${eventName} (${slug})\n이 고객에게 이벤트 수정 권한을 연결합니다.`;
}
