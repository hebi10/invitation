import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/_components/public-invitations/wedding/WeddingBase.module.css', 'utf8');
const component = readFileSync('src/components/sections/Guestbook/GuestbookThemed.tsx', 'utf8');
const section = css.slice(css.indexOf('/* UI-09-01 —'));
assert.ok(section.length > 1500, 'Guestbook structure rules missing');

for (const selector of ['.commentsGrid', '.commentItem', '.commentHeader', '.commentAuthor', '.authorName', '.commentDate', '.commentMessage']) {
  assert.ok(section.includes("[data-wedding-section='guestbook'] " + selector), 'Missing scoped guestbook structure: ' + selector);
}
assert.match(section, /\.commentHeader\s*\{[^}]*display: flex;[^}]*justify-content: space-between;/s);
assert.match(section, /\.commentItem\s*\{[^}]*display: block;[^}]*background: var\(--paper-soft\);[^}]*border: 1px solid var\(--line\);/s);
assert.match(section, /\.commentMessage\s*\{[^}]*white-space: pre-line;[^}]*overflow-wrap: anywhere;/s);
assert.match(section, /data-design='classic-r'/);
assert.match(component, /<div className=\{styles\.commentHeader\}>/);
assert.match(component, /<span className=\{authorNameClassName\}>\{comment\.author\}<\/span>/);
assert.match(component, /\{formatDate\(comment\.createdAt\)\}/);
assert.match(component, /<p className=\{styles\.commentMessage\}>\{comment\.message\}<\/p>/);
assert.match(component, /key=\{\x60\$\{comment\.collectionName/);
assert.match(component, /getCommentsPage\(/);
assert.match(component, /addComment\(/);
console.log('UI-09-01: guestbook information grouping and original data flow verified');
