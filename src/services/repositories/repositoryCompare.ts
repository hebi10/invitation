export function pickPreferredNormalizedRecord<T>(
  current: T | undefined,
  nextRecord: T,
  options: {
    isCanonical(record: T): boolean;
    getUpdatedAt(record: T): Date | null | undefined;
  }
) {
  if (!current) {
    return nextRecord;
  }

  if (options.isCanonical(nextRecord) && !options.isCanonical(current)) {
    return nextRecord;
  }

  return (options.getUpdatedAt(nextRecord)?.getTime() ?? 0) >=
    (options.getUpdatedAt(current)?.getTime() ?? 0)
    ? nextRecord
    : current;
}
