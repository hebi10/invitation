export interface WeddingCalendarEvent {
  eventDate: Date;
  title: string;
  location: string;
}

/** Stored wedding fields describe Korean wall time, regardless of the guest's timezone. */
export function toKoreanWeddingInstant(wallDate: Date): Date {
  if (!Number.isFinite(wallDate.getTime())) return new Date(NaN);
  return new Date(Date.UTC(wallDate.getFullYear(), wallDate.getMonth(), wallDate.getDate(), wallDate.getHours() - 9, wallDate.getMinutes()));
}

function calendarTimestamp(date: Date): string | null {
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 0 || date.getUTCFullYear() > 9999) {
    return null;
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

// RFC 5545 limits each physical line to 75 octets, including continuation spaces.
function foldLine(value: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let line = '';
  let bytes = 0;
  for (const character of value) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      lines.push(line);
      line = ' ';
      bytes = 1;
    }
    line += character;
    bytes += length;
  }
  lines.push(line);
  return lines.join('\r\n');
}

export function buildWeddingCalendar(
  { eventDate, title, location }: WeddingCalendarEvent,
  createdAt: Date = new Date(),
): string | null {
  const start = calendarTimestamp(eventDate);
  const stamp = calendarTimestamp(createdAt);
  if (!start || !stamp) return null;

  let hash = 2166136261;
  for (const character of `${start}\n${title}\n${location}`) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0;
  }

  // No DTEND or DURATION: the invitation supplies a start, not an assumed duration.
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Invitation//Wedding Calendar//KO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:wedding-${start}-${hash.toString(16)}@invitation.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `SUMMARY:${escapeText(title)}`,
    `LOCATION:${escapeText(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}
