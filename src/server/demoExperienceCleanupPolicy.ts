import 'server-only';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDemoExperienceDateKey(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function canDeleteDemoExperienceDate(
  targetDateKey: string,
  currentDateKey: string
) {
  return (
    isValidDemoExperienceDateKey(targetDateKey) &&
    isValidDemoExperienceDateKey(currentDateKey) &&
    targetDateKey < currentDateKey
  );
}
