import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const layoutSource = readSource('src/app/my-invitations/layout.tsx');
const rootLayoutSource = readSource('src/app/layout.tsx');
const dashboardSource = readSource('src/app/my-invitations/MyInvitationsClient.tsx');
const authSource = readSource('src/app/my-invitations/CustomerAuthPageClient.tsx');
const createSource = readSource('src/app/my-invitations/create/CreateInvitationClient.tsx');

assert.match(rootLayoutSource, /operation-theme\.css/);
assert.match(layoutSource, /data-operation-ui/);
assert.doesNotMatch(dashboardSource, /styles\.eyebrow/);
assert.doesNotMatch(authSource, /styles\.eyebrow/);
assert.doesNotMatch(createSource, /styles\.eyebrow/);
assert.match(dashboardSource, /styles\.summaryList/);
assert.doesNotMatch(authSource, /eyebrow:/);

console.log('customer account UI contract checks passed');
