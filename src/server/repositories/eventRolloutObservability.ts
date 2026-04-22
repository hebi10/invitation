export const EVENT_READ_FALLBACK_LOG_COLLECTION = 'event-read-fallback-logs';
export const EVENT_ROLLOUT_MISMATCH_COLLECTION = 'event-rollout-mismatches';

export interface EventReadFallbackLogEntry {
  domain: string;
  lookupType: string;
  lookupValue: string;
  reason: string;
  createdAt: Date;
}

export interface EventRolloutMismatchEntry {
  domain: string;
  lookupType: string;
  lookupValue: string;
  mismatchFields: string[];
  createdAt: Date;
}

async function addCollectionEntry(collectionName: string, entry: Record<string, unknown>) {
  let getServerFirestore: (() => any) | null = null;
  try {
    ({ getServerFirestore } = await import('../firebaseAdmin'));
  } catch {
    return;
  }

  const db = getServerFirestore?.();
  if (!db) {
    return;
  }

  await db.collection(collectionName).add(entry);
}

export async function recordEventReadFallback(entry: EventReadFallbackLogEntry) {
  await addCollectionEntry(EVENT_READ_FALLBACK_LOG_COLLECTION, {
    ...entry,
  });
}

export async function recordEventRolloutMismatch(entry: EventRolloutMismatchEntry) {
  if (!entry.mismatchFields.length) {
    return;
  }

  await addCollectionEntry(EVENT_ROLLOUT_MISMATCH_COLLECTION, {
    ...entry,
  });
}
