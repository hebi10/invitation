import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const wedding = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const weddingCSS = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const exportButton = read('src/app/_components/public-invitations/wedding/WeddingCalendarDownload.tsx');
const exportCSS = read('src/app/_components/public-invitations/wedding/WeddingCalendarDownload.module.css');
const calendar = read('src/app/_components/public-invitations/shared/PublicInvitationDateFeature.tsx');

assert.match(wedding, /contacts\.map\(\(contact, index\) =>/);
assert.match(wedding, /data-contact-group-start=\{index === 0 \|\| contacts\[index - 1\]\?\.side !== contact\.side/);
assert.match(wedding, /<span className=\{styles\.contactSide\}>\{contact\.side\}<\/span>/);
assert.match(wedding, /const contactSummary = \[\.\.\.new Set\(contacts\.map\(\(contact\) => contact\.side\)\)\]\.join\('·'\)/);
assert.match(wedding, /\{contacts\.length > 0 \? \(/);
assert.match(wedding, /<details[\s\S]*?data-wedding-section="contact"/);
assert.match(wedding, /href=\{`tel:\$\{contact\.phone\}`\}/);
assert.match(wedding, /href=\{`sms:\$\{contact\.phone\}`\}/);
assert.match(wedding, /aria-label=\{`\$\{contact\.side\} \$\{contact\.role\} \$\{contact\.name\}에게 전화하기`\}/);
assert.match(wedding, /aria-label=\{`\$\{contact\.side\} \$\{contact\.role\} \$\{contact\.name\}에게 문자 보내기`\}/);

assert.match(exportButton, /useId\(\)/);
assert.match(exportButton, /aria-label="캘린더에 저장"/);
assert.match(exportButton, /aria-describedby=\{hintId\}/);
assert.match(exportButton, /일정 파일\(\.ics\) 다운로드/);
assert.match(exportButton, /buildWeddingCalendar\(props\)/);
assert.match(exportButton, /link\.download = 'wedding\.ics'/);
assert.match(wedding, /<WeddingCalendarDownload/);
assert.match(wedding, /\{features\.showCountdown \? <details className=\{styles\.calendarDisclosure\}>/);
assert.match(wedding, /예식 달력 보기/);
assert.match(wedding, /이 페이지에서 달력 확인/);
assert.match(calendar, /mode = 'countdown'/);
assert.match(calendar, /model\.mode === 'calendar-countdown'/);

for (const token of ['contactSide', 'contactActions a', 'min-height: 48px', 'data-contact-group-start',
  "data-wedding-section='ceremony'", 'min-height: 72px', 'calendarDisclosure > summary',
  ':focus-visible', "data-design='gyeol'"]) {
  assert.ok(weddingCSS.includes(token), 'UI-07-C visual contract missing: ' + token);
}
assert.match(exportCSS, /\.buttonHint/);
assert.match(exportCSS, /\.buttonTitle/);
assert.doesNotMatch(exportButton, /\b(?:setDoc|updateDoc|deleteDoc|addDoc)\(/);

console.log('UI-07-C: family contact grouping, native disclosure, ICS/export semantics and 5-theme styles verified');
