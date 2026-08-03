export interface ClientEventOwnerFields {
  ownerUid: string | null;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
}

export function resolveNextClientEventOwner(input: {
  existingEventFound: boolean;
  existing: ClientEventOwnerFields | null;
  requested: ClientEventOwnerFields | null;
  currentAuthOwner: ClientEventOwnerFields | null;
  initializeOwnerFromCurrentAuth: boolean;
}): ClientEventOwnerFields {
  if (input.existingEventFound) {
    return (
      input.existing ?? {
        ownerUid: null,
        ownerEmail: null,
        ownerDisplayName: null,
      }
    );
  }

  if (input.requested?.ownerUid) {
    return input.requested;
  }

  if (input.initializeOwnerFromCurrentAuth && input.currentAuthOwner?.ownerUid) {
    return input.currentAuthOwner;
  }

  return {
    ownerUid: null,
    ownerEmail: null,
    ownerDisplayName: null,
  };
}
