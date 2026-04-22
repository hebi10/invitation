import { isLegacyReadFallbackEnabled } from './eventRolloutConfig';

export function shouldFallbackReadThroughValue<T>(value: T | null | undefined) {
  return value == null;
}

export async function loadReadThroughValue<T>(options: {
  preferred: () => Promise<T | null>;
  fallback: () => Promise<T | null>;
  shouldFallback?: (value: T | null) => boolean;
}) {
  const preferredValue = await options.preferred();
  const shouldFallback =
    options.shouldFallback ?? ((value: T | null) => shouldFallbackReadThroughValue(value));

  if (!shouldFallback(preferredValue)) {
    return preferredValue;
  }

  if (!isLegacyReadFallbackEnabled()) {
    return preferredValue;
  }

  return options.fallback();
}
