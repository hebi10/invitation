export type OwnedInvitationListRequest = {
  uid: string;
  sequence: number;
};

export function createOwnedInvitationListRequestGate() {
  let sequence = 0;

  return {
    begin(uid: string): OwnedInvitationListRequest {
      sequence += 1;
      return { uid, sequence };
    },
    isCurrent(request: OwnedInvitationListRequest, activeUid: string | null): boolean {
      return request.sequence === sequence && request.uid === activeUid;
    },
    invalidate(): void {
      sequence += 1;
    },
  };
}
