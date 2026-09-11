import assert from 'node:assert/strict';
import { buildWeddingCalendar, toKoreanWeddingInstant } from '../src/lib/weddingCalendar.ts';

const originalTimezone = process.env.TZ;
try {
  for (const timezone of ['Asia/Seoul', 'America/New_York', 'Europe/London']) {
    process.env.TZ = timezone;
    assert.equal(toKoreanWeddingInstant(new Date(2027, 6, 26, 13, 30)).toISOString(), '2027-07-26T04:30:00.000Z');
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
