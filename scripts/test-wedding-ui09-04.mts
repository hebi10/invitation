import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const qa = read('scripts/qa-invitation-ui09-04.py');
const workflow = read('.github/workflows/invitation-ui09-04-qa.yml');
const component = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const css = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');

for (const theme of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional']) {
  assert.ok(qa.includes('"' + theme + '"'), 'Missing theme ' + theme);
  assert.ok(css.includes(".page[data-design='" + theme + "']"), 'Missing CSS theme ' + theme);
}
for (const width of [320, 390, 768, 1440]) {
  assert.ok(qa.includes('(' + width + ','), 'Missing responsive viewport ' + width);
}
assert.match(qa, /width == 768/, '200% zoom must be included');
assert.match(qa, /production_writes": 0/);
assert.match(qa, /demo_submissions": 3/);
assert.match(qa, /pagination_roundtrip": True/);
assert.match(qa, /keyboard_summary": True/);
assert.match(qa, /get_by_role\("navigation", name="방명록 페이지"\)/);
assert.match(qa, /aria-current/);
assert.match(qa, /name\.fill/);
assert.match(qa, /body\.fill/);
assert.match(qa, /page\.keyboard\.press\("Enter"\)/);
assert.match(qa, /page\.keyboard\.press\("Space"\)/);
assert.match(qa, /query = urlencode\(\{"qaTheme": theme, "qaUI07": "1", "embed": "1"\}\)/);
assert.doesNotMatch(qa, /https:\/\/invite\.msgnote\.kr|firebase_admin|setDoc\(/i);
assert.match(workflow, /NEXT_PUBLIC_USE_FIREBASE: 'false'/);
assert.match(workflow, /python scripts\/qa-invitation-ui09-04\.py/);
assert.match(workflow, /actions\/upload-artifact@v4/);
assert.match(component, /demoComments/);
assert.match(component, /aria-current=\{currentPage === page \? 'page'/);
console.log('UI-09-04: development-only, five-design 25-case browser QA contracts passed');
