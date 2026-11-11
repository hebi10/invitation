import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');
const wedding = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const css = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const gift = read('src/components/sections/GiftInfo/GiftInfoThemed.tsx');
const guestbook = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const route = read('src/app/sample-invitation/page.tsx');
const sample = read('src/app/sample-invitation/SampleInvitation.tsx');

for (const token of [
  '--ui07-section-gap', '--ui07-summary-min-height', '--ui07-details-content-gap',
  '--ui07-action-gap', '--ui07-panel-padding-inline', '--ui07-panel-border',
]) {
  assert.ok(css.includes(token), token + ' must be defined in the public wedding stylesheet');
}

assert.match(wedding, /const contactSummary = \[\.\.\.new Set\(contacts\.map\(\(contact\) => contact\.side\)\)\]\.join\('·'\)/);
assert.match(wedding, /<details[\s\S]*?data-wedding-section="contact"[\s\S]*?<summary className=\{styles\.disclosureSummary\}>[\s\S]*?styles\.summaryDescription\}>\{contactSummary\}/);
assert.match(wedding, /<summary className=\{styles\.disclosureSummary\}>[\s\S]*?예식 달력 보기[\s\S]*?이 페이지에서 달력 확인/);
assert.match(wedding, /\{guideSummary \? <p className=\{styles\.guideSummary\}>\{guideSummary\}<\/p> : null\}\s*<details className=\{styles\.guideDisclosure\}>/);
assert.match(wedding, /<summary className=\{styles\.disclosureSummary\}>교통·방문 상세 내용 보기<\/summary>/);
assert.doesNotMatch(wedding, /교통 · 식사 안내 자세히 보기/);

const sectionIndexes = [
  "data-wedding-section=\"invitation\"", "data-wedding-section=\"contact\"",
  "data-wedding-section=\"gallery\"", "data-wedding-section=\"ceremony\"",
  "data-wedding-section=\"schedule\"", "data-wedding-section=\"transport\"",
  "data-wedding-section=\"gift\"", "data-wedding-section=\"guestbook\"",
];
// The gallery JSX is a variable assembled above the return statement;
// check stable names without claiming the source-order matches the rendered order.
for (const section of sectionIndexes) assert.ok(wedding.includes(section), section);
assert.match(wedding, /<WeddingCalendarDownload/);
assert.match(wedding, /<LocationMap/);
assert.match(wedding, /<GiftInfoThemed/);
assert.match(wedding, /<GuestbookThemed/);

assert.match(css, /\.page \[data-wedding-section='transport'\] \.guideDisclosure \{[\s\S]*?background: var\(--paper-soft\)/);
assert.match(css, /\.page \[data-wedding-section='gift'\] \.accountsContainer \{[\s\S]*?border: var\(--ui07-panel-border\)/);
assert.match(css, /\.page\[data-design='gyeol'\] \[data-wedding-section='gift'\] \.accountsContainer \{[\s\S]*?border: 0;[\s\S]*?background: var\(--paper-soft\)/);
assert.match(css, /\.page \[data-wedding-section='transport'\] \.guideDisclosure\[open\] \.storedSection \{[\s\S]*?var\(--ui07-details-content-gap\)/);
assert.match(css, /\.page \.summaryDescription \{[\s\S]*?font-size: 14px;/);
assert.match(css, /\.page \[data-wedding-section='contact'\] > \.disclosureSummary::after/);
assert.match(css, /@media \(max-width: 359px\)[\s\S]*?--ui07-panel-padding-inline: 16px/);

assert.match(gift, /<details className=\{styles\.accountSection\}>/);
assert.match(gift, /<summary className=\{styles\.accountSummary\}>/);
assert.match(gift, /const handleCopy = async/);
assert.match(guestbook, /<details className=\{styles\.formDisclosure\}>/);
assert.match(guestbook, /<summary className=\{styles\.formSummary\}>축하 글 남기기<\/summary>/);
assert.match(guestbook, /<form className=\{styles\.form\} onSubmit=\{handleSubmit\}/);

assert.match(route, /process\.env\.NODE_ENV !== 'production' && query\.qaUI07 === '1'/);
assert.match(sample, /qaUI07 \? (?:qaState|makeQAUI07State\(qaUI07Case\)) : sampleState/);
assert.match(sample, /accountNumber: '000-000-000000'/);
assert.doesNotMatch(sample, /(?:setDoc|updateDoc|deleteDoc|addDoc)\(/);

console.log('Invitation UI-07-A-06 public section, data, native disclosure and QA fixture contracts passed.');
