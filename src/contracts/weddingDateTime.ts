export type WeddingDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function isValidWeddingDateTime(value: WeddingDateTime | null | undefined): value is WeddingDateTime {
  if (!value) return false;
  const { year, month, day, hour, minute } = value;
  return Number.isInteger(year) && year >= 1900 && year <= 9999 &&
    Number.isInteger(month) && month >= 0 && month <= 11 &&
    Number.isInteger(day) && day >= 1 && day <= new Date(Date.UTC(year, month + 1, 0)).getUTCDate() &&
    Number.isInteger(hour) && hour >= 0 && hour <= 23 &&
    Number.isInteger(minute) && minute >= 0 && minute <= 59;
}

export function formatWeddingTimeLabel({ hour, minute }: WeddingDateTime) {
  return `${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${String(minute).padStart(2, '0')}`;
}

export function formatWeddingDateTimeLabel(value: WeddingDateTime, includeTime = true) {
  const { year, month, day } = value;
  const date = `${year}. ${month + 1}. ${day}.`;
  return includeTime ? `${date} · ${formatWeddingTimeLabel(value)}` : date;
}
