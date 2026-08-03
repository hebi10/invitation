export type CustomerEventClaimState =
  | 'claimable'
  | 'owner'
  | 'different-owner';

export class CustomerEventClaimError extends Error {
  status: number;
  code: 'invalid' | 'missing' | 'admin' | 'different-owner' | 'unavailable';

  constructor(
    status: number,
    code: CustomerEventClaimError['code'],
    message: string
  ) {
    super(message);
    this.name = 'CustomerEventClaimError';
    this.status = status;
    this.code = code;
  }
}

export function resolveCustomerEventClaimState(input: {
  currentOwnerUid: string | null | undefined;
  claimantUid: string;
  adminUserIds: ReadonlySet<string>;
}): CustomerEventClaimState {
  const currentOwnerUid = input.currentOwnerUid?.trim() ?? '';
  const claimantUid = input.claimantUid.trim();

  if (!currentOwnerUid) {
    return 'claimable';
  }

  if (currentOwnerUid === claimantUid) {
    return 'owner';
  }

  return input.adminUserIds.has(currentOwnerUid)
    ? 'claimable'
    : 'different-owner';
}
