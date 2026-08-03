import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync('src/app/admin/_hooks/adminDataGateway.ts', 'utf8');
const hook = readFileSync('src/app/admin/_hooks/useAdminData.ts', 'utf8');
const adminPage = readFileSync('src/app/admin/AdminPageClient.tsx', 'utf8');
const workspace = readFileSync(
  'src/app/admin/_components/AdminEventWorkspace.tsx',
  'utf8'
);

assert.match(gateway, /demoExperienceAdminDataGateway/);
assert.match(hook, /gateway\.getPages/);
assert.match(hook, /gateway\.deleteEvent/);
assert.doesNotMatch(hook, /getAllManagedInvitationPages\(\)/);
assert.match(adminPage, /routes=/);
assert.match(workspace, /금일 체험 청첩장/);

console.log('demo experience admin gateway checks passed');
