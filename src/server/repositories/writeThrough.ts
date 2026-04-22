import { getServerFirestore } from '../firebaseAdmin';
import {
  executeWriteThrough as executeWriteThroughCore,
  type EventWriteThroughFailureRecord,
  type ExecuteWriteThroughOptions,
} from './writeThroughCore';

export const EVENT_WRITE_THROUGH_FAILURE_COLLECTION = 'event-write-through-failures';

async function recordEventWriteThroughFailure(entry: EventWriteThroughFailureRecord) {
  const db = getServerFirestore();
  if (!db) {
    return;
  }

  await db.collection(EVENT_WRITE_THROUGH_FAILURE_COLLECTION).add({
    ...entry,
  });
}

export type {
  EventWriteThroughFailureRecord,
  ExecuteWriteThroughOptions,
};

export async function executeWriteThrough<T>(
  options: ExecuteWriteThroughOptions<T>
) {
  return executeWriteThroughCore({
    ...options,
    recordFailure: options.recordFailure ?? recordEventWriteThroughFailure,
  });
}
