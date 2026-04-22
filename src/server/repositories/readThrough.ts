import { isLegacyReadFallbackEnabled } from './eventRolloutConfig';
import {
  recordEventReadFallback,
  recordEventRolloutMismatch,
} from './eventRolloutObservability';

export function shouldFallbackReadThroughValue<T>(value: T | null | undefined) {
  return value == null;
}

export async function loadReadThroughValue<T>(options: {
  preferred: () => Promise<T | null>;
  fallback: () => Promise<T | null>;
  shouldFallback?: (value: T | null) => boolean;
  context?: {
    domain: string;
    lookupType: string;
    lookupValue: string;
    reason?: string;
  };
  compare?: (preferred: T, fallback: T) => string[];
}) {
  const preferredValue = await options.preferred();
  const shouldFallback =
    options.shouldFallback ?? ((value: T | null) => shouldFallbackReadThroughValue(value));

  if (!shouldFallback(preferredValue)) {
    const compareContext = options.context;
    if (preferredValue && options.compare && compareContext && isLegacyReadFallbackEnabled()) {
      void options
        .fallback()
        .then((fallbackValue) => {
          if (!fallbackValue) {
            return;
          }

          const mismatchFields = options.compare?.(preferredValue, fallbackValue) ?? [];
          if (mismatchFields.length === 0) {
            return;
          }

          return recordEventRolloutMismatch({
            domain: compareContext.domain,
            lookupType: compareContext.lookupType,
            lookupValue: compareContext.lookupValue,
            mismatchFields,
            createdAt: new Date(),
          });
        })
        .catch((error) => {
          console.error('[event-read-through] failed to compare preferred and fallback values', error);
        });
    }

    return preferredValue;
  }

  if (!isLegacyReadFallbackEnabled()) {
    return preferredValue;
  }

  const fallbackValue = await options.fallback();

  if (fallbackValue && options.context) {
    void recordEventReadFallback({
      domain: options.context.domain,
      lookupType: options.context.lookupType,
      lookupValue: options.context.lookupValue,
      reason: options.context.reason ?? 'preferred-missing',
      createdAt: new Date(),
    }).catch((error) => {
      console.error('[event-read-through] failed to record fallback usage', error);
    });
  }

  if (preferredValue && fallbackValue && options.compare && options.context) {
    const mismatchFields = options.compare(preferredValue, fallbackValue);
    if (mismatchFields.length > 0) {
      void recordEventRolloutMismatch({
        domain: options.context.domain,
        lookupType: options.context.lookupType,
        lookupValue: options.context.lookupValue,
        mismatchFields,
        createdAt: new Date(),
      }).catch((error) => {
        console.error('[event-read-through] failed to record mismatch', error);
      });
    }
  }

  return fallbackValue;
}
