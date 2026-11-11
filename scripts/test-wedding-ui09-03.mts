import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const component = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const css = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const scope = css.slice(css.indexOf('/* UI-09-03 —'));
assert.ok(scope.length > 2500, 'Missing UI-09-03 wedding-only UI rules');

for (const selector of ['.formDisclosure', '.formSummary', '.formContainer', '.form', '.submitButton', '.refreshButton', '.pagination', '.pageInfo']) {
  assert.ok(scope.includes("[data-wedding-section='guestbook'] " + selector), 'Missing scoped control: ' + selector);
}
assert.match(scope, /min-height: 48px;/, 'Writing controls need 48px minimum height');
assert.match(scope, /min-height: 44px;/, 'Pagination and refresh controls need 44px minimum height');
assert.match(scope, /background: var\(--accent\)/);
assert.match(scope, /border: 1px solid var\(--line\)/);
assert.match(scope, /@media \(max-width: 359px\)/);
assert.doesNotMatch(scope, /box-shadow:|linear-gradient\(/, 'Flat theme controls should remain undecorated');

assert.match(component, /aria-label=\{commentsQuery\.isFetching \? '축하 메시지 새로고침 중' : '축하 메시지 새로고침'\}/);
assert.match(component, /disabled=\{commentsQuery\.isFetching\}/);
assert.match(component, /aria-busy=\{isSubmitting\}/);
assert.match(component, /aria-current="page"/);
assert.match(component, /<nav className=\{styles\.pagination\} aria-label="방명록 페이지">/);
assert.match(component, /!commentsQuery\.data\?\.nextCursor/);
assert.match(component, /if \(!nextCursor \|\| commentsQuery\.isFetching\) return;/);
assert.match(component, /getCommentsPage\(pageSlug, pageCursors\[currentPage - 1\] \?\? null\)/);
assert.match(component, /setPageCursors\(cursors => \[\.\.\.cursors\.slice\(0, currentPage\), nextCursor\]\)/);
assert.match(component, /invalidateQueries\(/, 'Submission should retain TanStack Query invalidation');
console.log('UI-09-03 guestbook form, refresh, accessible pagination and cursor contracts passed');
