import assert from 'node:assert/strict';

import { createDemoExperienceSeedEvents } from '@/config/demoExperienceSeeds';

const first = createDemoExperienceSeedEvents('2026-08-03');
const second = createDemoExperienceSeedEvents('2026-08-03');

assert.equal(first.length, 15);
assert.deepEqual(first, second);
assert.equal(new Set(first.map((event) => event.slug)).size, 15);
assert.ok(first.every((event) => event.config.eventType === 'wedding'));
assert.ok(first.every((event) => event.kind === 'seed'));
assert.ok(first.some((event) => event.published));
assert.ok(first.some((event) => !event.published));
assert.ok(first.some((event) => event.ownerUid === null));
assert.ok(first.some((event) => event.ownerUid !== null));

console.log('demo experience seed checks passed');

