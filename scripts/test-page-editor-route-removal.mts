import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageEditorRouteFiles = [
  join('src', 'app', 'page-editor', 'page.tsx'),
  join('src', 'app', 'page-editor', 'layout.tsx'),
  join('src', 'app', 'page-editor', '[slug]', 'page.tsx'),
];

for (const file of pageEditorRouteFiles) {
  assert.equal(existsSync(file), false, `${file} must be removed`);
}

const filesToCheck = [
  'src/app/admin/_components/AdminPagesTab.tsx',
];

for (const file of filesToCheck) {
  const source = readFileSync(file, 'utf8');

  assert.doesNotMatch(
    source,
    /\/page-editor|page-editor/,
    `${file} must not reference page-editor`
  );
}

console.log('page-editor route removal checks passed');
