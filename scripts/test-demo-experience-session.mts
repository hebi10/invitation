import assert from 'node:assert/strict';

import {
  createDemoExperienceSessionValue,
  verifyDemoExperienceSessionValue,
} from '@/server/demoExperienceSession';
import {
  assertSameOriginDemoMutation,
  DemoExperienceRequestError,
  requireDemoExperienceSession,
} from '@/server/demoExperienceRequest';

const now = new Date('2026-08-03T03:00:00.000Z');
const issued = createDemoExperienceSessionValue(
  { sessionId: 'session-1', role: 'admin', dateKey: '2026-08-03' },
  { now, secret: 'test-secret' }
);

assert.equal(
  verifyDemoExperienceSessionValue(issued.value, { now, secret: 'test-secret' })?.role,
  'admin'
);
assert.equal(
  verifyDemoExperienceSessionValue(`${issued.value}x`, { now, secret: 'test-secret' }),
  null
);
assert.equal(
  verifyDemoExperienceSessionValue(issued.value, {
    now: new Date('2026-08-03T15:00:00.000Z'),
    secret: 'test-secret',
  }),
  null
);

const request = new Request('https://example.test/api/experience/events', {
  method: 'PATCH',
  headers: {
    cookie: `demo-experience-session=${issued.value}`,
    origin: 'https://example.test',
  },
});
assertSameOriginDemoMutation(request);
assertSameOriginDemoMutation(
  new Request('http://localhost:3000/api/experience/events', {
    method: 'PATCH',
    headers: {
      host: '127.0.0.1:3000',
      origin: 'http://127.0.0.1:3000',
    },
  })
);
assertSameOriginDemoMutation(
  new Request('http://internal:8080/api/experience/events', {
    method: 'PATCH',
    headers: {
      host: 'experience.example.test',
      origin: 'https://experience.example.test',
      'x-forwarded-proto': 'https',
    },
  })
);
assert.equal(
  requireDemoExperienceSession(request, ['admin'], { now, secret: 'test-secret' }).sessionId,
  'session-1'
);

assert.throws(
  () =>
    assertSameOriginDemoMutation(
      new Request('https://example.test/api/experience/events', {
        method: 'PATCH',
        headers: { origin: 'https://evil.test' },
      })
    ),
  (error) => error instanceof DemoExperienceRequestError && error.status === 403
);
assert.throws(
  () => requireDemoExperienceSession(request, ['customer'], { now, secret: 'test-secret' }),
  (error) =>
    error instanceof DemoExperienceRequestError && error.code === 'DEMO_ROLE_FORBIDDEN'
);
assert.throws(
  () =>
    requireDemoExperienceSession(request, ['admin'], {
      now: new Date('2026-08-03T15:00:00.000Z'),
      secret: 'test-secret',
    }),
  (error) =>
    error instanceof DemoExperienceRequestError && error.code === 'DEMO_DAY_ROLLED_OVER'
);

console.log('demo experience session checks passed');
