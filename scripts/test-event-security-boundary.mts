import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync('firestore.rules', 'utf8');
const ownerUpdate = rules.match(/function canUpdateOwnedEvent\(eventId\) \{([\s\S]*?)\n    \}/)?.[1] ?? '';
assert.match(ownerUpdate, /affectedKeys\(\)\.hasOnly\(/, 'Owned event writes must use an explicit field allowlist.');
for (const field of ['displayPeriod', 'visibility', 'ownerEmail', 'ownerUid', 'stats', 'security', 'deletion']) {
  const allowlist = ownerUpdate.match(/hasOnly\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
  assert.ok(!allowlist.includes(`'${field}'`), `Owner writes must not allow ${field}.`);
}
const rootEventRules = rules.match(/match \/events\/\{eventId\} \{([\s\S]*?)match \/content/)?.[1] ?? '';
assert.doesNotMatch(rootEventRules, /canReadPublicEvent/, 'Public visitors must not read private root event fields.');
assert.match(rootEventRules, /isAdmin\(\) \|\| isEventOwnerById\(eventId\)/);
console.log('event security boundary checks passed');
