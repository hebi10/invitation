import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { canDeleteDemoExperienceDate } from '@/server/demoExperienceCleanupPolicy';

assert.equal(canDeleteDemoExperienceDate('2026-08-02', '2026-08-03'), true);
assert.equal(canDeleteDemoExperienceDate('2026-08-03', '2026-08-03'), false);
assert.equal(canDeleteDemoExperienceDate('2026-08-04', '2026-08-03'), false);
assert.equal(canDeleteDemoExperienceDate('../events', '2026-08-03'), false);
assert.equal(canDeleteDemoExperienceDate('2026-02-30', '2026-08-03'), false);

const route = readFileSync(
  path.join(process.cwd(), 'src/app/api/experience/cleanup/route.ts'),
  'utf8'
);
assert.match(route, /DEMO_EXPERIENCE_CLEANUP_SECRET/);
assert.match(route, /recursiveDeleteDate/);
assert.match(route, /timingSafeEqual/);
assert.doesNotMatch(route, /collection\(['"](?:events|eventSlugIndex|admin-users)['"]\)/);

console.log('demo experience cleanup policy checks passed');
