import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) {
  return readFileSync(path, 'utf8');
}

const service = read('src/server/demoExperienceService.ts');
const eventsRoute = read('src/app/api/experience/events/route.ts');
const eventRoute = read('src/app/api/experience/events/[slug]/route.ts');
const commentRoute = read(
  'src/app/api/experience/events/[slug]/comments/[commentId]/route.ts'
);

assert.match(eventsRoute, /requireDemoExperienceSession/);
assert.match(eventsRoute, /assertSameOriginDemoMutation/);
assert.doesNotMatch(eventsRoute, /verifyAdminRequest|verifyCustomerRequest/);
assert.doesNotMatch(service, /eventRepository|customerWallet|adminUser/);
assert.match(eventRoute, /VERSION_CONFLICT/);
assert.match(eventRoute, /DEMO_SEED_READ_ONLY/);
assert.match(commentRoute, /DEMO_SEED_READ_ONLY/);
assert.match(eventRoute, /demo-experience-mutation/);
assert.match(commentRoute, /demo-experience-mutation/);

console.log('demo experience API policy checks passed');
