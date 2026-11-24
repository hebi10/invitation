import assert from 'node:assert/strict';
import { buildWeddingCalendar, toKoreanWeddingInstant } from '../src/lib/weddingCalendar.ts';

const originalTimezone = process.env.TZ;
try {
  for (const timezone of ['Asia/Seoul', 'America/New_York', 'Europe/London']) {
    process.env.TZ = timezone;
    assert.equal(toKoreanWeddingInstant({ year: 2027, month: 6, day: 26, hour: 13, minute: 30 }).toISOString(), '2027-07-26T04:30:00.000Z');
    assert.equal(toKoreanWeddingInstant({ year: 2028, month: 2, day: 12, hour: 2, minute: 30 }).toISOString(), '2028-03-11T17:30:00.000Z', 'A local daylight saving gap must not change the KST wedding time');
  }
} finally {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
}

const event = {
  eventDate: new Date('2027-07-26T13:30:00+09:00'),
  title: '김태현 · 최유나 결혼식',
  location: '서울, 예식장; 2층\\홀\r\n입구',
};
const calendar = buildWeddingCalendar(event, new Date('2026-09-11T01:00:00Z'))!;
assert.ok(Number.isNaN(toKoreanWeddingInstant({ year: 0, month: 0, day: 0, hour: 0, minute: 0 }).getTime()));
assert.ok(calendar.includes('DTSTART:20270726T043000Z\r\n'));
assert.ok(calendar.includes('DTSTAMP:20260911T010000Z\r\n'));
assert.ok(calendar.includes('LOCATION:서울\\, 예식장\\; 2층\\\\홀\\n입구\r\n'));
assert.ok(!calendar.includes('DTEND'));
assert.ok(!calendar.includes('DURATION'));
assert.ok(calendar.endsWith('END:VCALENDAR\r\n'));
assert.ok(!/(?<!\r)\n/.test(calendar));
assert.equal(buildWeddingCalendar({ ...event, eventDate: new Date('invalid') }), null);

const longTitle = '두 사람의 새로운 시작을 축하해주세요 💐'.repeat(20);
const folded = buildWeddingCalendar({ ...event, title: longTitle })!;
for (const line of folded.split('\r\n')) {
  assert.ok(Buffer.byteLength(line, 'utf8') <= 75, 'Physical ICS lines must fit 75 UTF-8 bytes');
}
assert.ok(folded.replace(/\r\n /g, '').includes(`SUMMARY:${longTitle}\r\n`));
assert.ok(!folded.includes('\ufffd'), 'Folding must not split Unicode characters');
const uid = (value: string) => value.match(/^UID:.+$/m)?.[0];
assert.equal(uid(calendar), uid(buildWeddingCalendar(event)!));
console.log('Wedding calendar checks passed');
