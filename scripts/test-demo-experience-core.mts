import assert from 'node:assert/strict';

import {
  getKstDateKey,
  getNextKstMidnight,
  isDemoExperienceDateExpired,
} from '@/lib/demoExperienceTime';
import { buildAppRoutes } from '@/lib/demoExperienceRoutes';

assert.equal(getKstDateKey(new Date('2026-08-02T14:59:59.000Z')), '2026-08-02');
assert.equal(getKstDateKey(new Date('2026-08-02T15:00:00.000Z')), '2026-08-03');
assert.equal(
  getNextKstMidnight(new Date('2026-08-02T15:00:00.000Z')).toISOString(),
  '2026-08-03T15:00:00.000Z'
);
assert.equal(
  isDemoExperienceDateExpired('2026-08-02', new Date('2026-08-02T15:00:00.000Z')),
  true
);

const experience = buildAppRoutes('experience');
assert.equal(experience.admin(), '/experience/admin');
assert.equal(experience.customerDashboard(), '/experience/my-invitations');
assert.equal(experience.wizardCreate('wedding'), '/experience/page-wizard');
assert.equal(
  experience.wizardEdit('daily-experience-wedding'),
  '/experience/page-wizard/daily-experience-wedding'
);
assert.equal(
  experience.preview('daily-experience-wedding', 'romantic'),
  '/experience/preview/daily-experience-wedding/romantic'
);

const production = buildAppRoutes('production');
assert.equal(production.admin(), '/admin');
assert.equal(production.customerDashboard(), '/my-invitations');
assert.equal(production.wizardEdit('sample'), '/page-wizard/sample');
assert.equal(production.preview('sample', 'romantic'), '/sample/romantic');

console.log('demo experience core checks passed');
