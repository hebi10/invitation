import assert from 'node:assert/strict';

import {
  buildDummyEventWritePlan,
  DUMMY_EVENT_SEEDS,
} from './seed-dummy-events.mts';
import type { EventTypeKey } from '../src/lib/eventTypes.ts';

const expectedEventTypes: EventTypeKey[] = [
  'birthday',
  'first-birthday',
  'general-event',
  'opening',
];

assert.equal(DUMMY_EVENT_SEEDS.length, 12);

for (const eventType of expectedEventTypes) {
  assert.equal(
    DUMMY_EVENT_SEEDS.filter((seed) => seed.eventType === eventType).length,
    3,
    `${eventType} should have three dummy seeds`
  );
}

const slugs = DUMMY_EVENT_SEEDS.map((seed) => seed.slug);
assert.equal(new Set(slugs).size, slugs.length, 'dummy event slugs must be unique');

for (const seed of DUMMY_EVENT_SEEDS) {
  assert.equal(seed.published, true, `${seed.slug} should be published`);
  assert.equal(seed.status, 'active', `${seed.slug} should be active`);
  assert.equal(Boolean(seed.displayName.trim()), true, `${seed.slug} needs display name`);
  assert.equal(Boolean(seed.description.trim()), true, `${seed.slug} needs description`);
  assert.equal(Boolean(seed.venue.trim()), true, `${seed.slug} needs venue`);
  assert.equal(Boolean(seed.pageData?.greetingMessage?.trim()), true);
}

const writePlan = buildDummyEventWritePlan(DUMMY_EVENT_SEEDS);
assert.equal(writePlan.length, 36);

for (const seed of DUMMY_EVENT_SEEDS) {
  const eventId = `evt_${seed.slug}`;

  assert.equal(
    writePlan.some((write) => write.path === `events/${eventId}`),
    true,
    `${seed.slug} should write event summary`
  );
  assert.equal(
    writePlan.some((write) => write.path === `events/${eventId}/content/current`),
    true,
    `${seed.slug} should write current content`
  );
  assert.equal(
    writePlan.some((write) => write.path === `eventSlugIndex/${seed.slug}`),
    true,
    `${seed.slug} should write slug index`
  );
}

console.log('dummy event seed checks passed');
