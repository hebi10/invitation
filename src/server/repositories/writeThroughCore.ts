import { getEventRolloutWriteMode, type EventRolloutWriteMode } from './eventRolloutConfig';

export interface EventWriteThroughFailureRecord {
  operation: string;
  pageSlug: string;
  eventId: string | null;
  sourceOfTruth: 'legacy' | 'event';
  legacyCollection: string;
  eventCollection: string | null;
  payload: Record<string, unknown>;
  attemptCount: number;
  errorMessage: string;
  errorStack: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecuteWriteThroughOptions<T> {
  operation: string;
  pageSlug: string;
  eventId?: string | null;
  writeMode?: EventRolloutWriteMode;
  legacyCollection: string;
  eventCollection?: string | null;
  payload?: Record<string, unknown>;
  retries?: number;
  legacyWrite?: () => Promise<T>;
  eventWrite?: () => Promise<T>;
  recordFailure?: (entry: EventWriteThroughFailureRecord) => Promise<void>;
}

function normalizePayloadValue(value: unknown, depth = 0): unknown {
  if (value === null) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (depth >= 2) {
      return `[array:${value.length}]`;
    }

    return value.slice(0, 10).map((entry) => normalizePayloadValue(entry, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= 2) {
      return '[object]';
    }

    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entryValue]) => {
        const normalized = normalizePayloadValue(entryValue, depth + 1);
        return normalized === undefined ? [] : [[key, normalized]];
      })
    );
  }

  return undefined;
}

function normalizePayload(payload: Record<string, unknown> | undefined) {
  return Object.fromEntries(
    Object.entries(payload ?? {}).flatMap(([key, value]) => {
      const normalized = normalizePayloadValue(value);
      return normalized === undefined ? [] : [[key, normalized]];
    })
  );
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    message: String(error),
    stack: null,
  };
}

async function attemptMirrorWrite(
  mirror: () => Promise<void>,
  retries: number
): Promise<{ success: true; attemptCount: number } | { success: false; attemptCount: number; error: unknown }> {
  let attemptCount = 0;

  while (attemptCount <= retries) {
    attemptCount += 1;
    try {
      await mirror();
      return {
        success: true,
        attemptCount,
      };
    } catch (error) {
      if (attemptCount > retries) {
        return {
          success: false,
          attemptCount,
          error,
        };
      }
    }
  }

  return {
    success: false,
    attemptCount,
    error: new Error('Mirror write failed.'),
  };
}

export async function executeWriteThrough<T>({
  operation,
  pageSlug,
  eventId = null,
  writeMode = getEventRolloutWriteMode(),
  legacyCollection,
  eventCollection = null,
  payload,
  retries = 1,
  legacyWrite,
  eventWrite,
  recordFailure,
}: ExecuteWriteThroughOptions<T>) {
  if (writeMode === 'event-only') {
    if (!eventWrite) {
      throw new Error('Event write handler is required when event rollout write mode is event-only.');
    }

    try {
      return await eventWrite();
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (recordFailure) {
        try {
          await recordFailure({
            operation,
            pageSlug,
            eventId,
            sourceOfTruth: 'event',
            legacyCollection,
            eventCollection,
            payload: normalizePayload(payload),
            attemptCount: 1,
            errorMessage: normalizedError.message,
            errorStack: normalizedError.stack,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (failureLoggingError) {
          console.error('[event-write-through] failed to record event-only failure', failureLoggingError);
        }
      }

      throw error;
    }
  }

  if (!legacyWrite) {
    throw new Error('Legacy write handler is required when event rollout write mode is legacy-primary.');
  }

  let primaryResult: T;
  try {
    primaryResult = await legacyWrite();
  } catch (error) {
    const normalizedError = normalizeError(error);

    if (recordFailure) {
      try {
        await recordFailure({
          operation,
          pageSlug,
          eventId,
          sourceOfTruth: 'legacy',
          legacyCollection,
          eventCollection,
          payload: normalizePayload(payload),
          attemptCount: 1,
          errorMessage: normalizedError.message,
          errorStack: normalizedError.stack,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (failureLoggingError) {
        console.error('[event-write-through] failed to record primary failure', failureLoggingError);
      }
    }

    throw error;
  }

  if (!eventWrite) {
    return primaryResult;
  }

  const mirrorResult = await attemptMirrorWrite(async () => {
    await eventWrite();
  }, retries);
  if (mirrorResult.success) {
    return primaryResult;
  }

  const normalizedError = normalizeError(mirrorResult.error);
  console.error('[event-write-through] mirror write failed', {
    operation,
    pageSlug,
    eventId,
    attemptCount: mirrorResult.attemptCount,
    error: normalizedError.message,
  });

  if (recordFailure) {
    try {
      await recordFailure({
        operation,
        pageSlug,
        eventId,
        sourceOfTruth: 'legacy',
        legacyCollection,
        eventCollection,
        payload: normalizePayload(payload),
        attemptCount: mirrorResult.attemptCount,
        errorMessage: normalizedError.message,
        errorStack: normalizedError.stack,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (failureLoggingError) {
      console.error('[event-write-through] failed to record partial failure', failureLoggingError);
    }
  }

  return primaryResult;
}
