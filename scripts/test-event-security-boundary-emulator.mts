import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.GCLOUD_PROJECT;
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.equal(projectId, 'demo-invitation-review', 'This test may only use the isolated review project.');
assert.ok(host && /^(127\.0\.0\.1|localhost):\d+$/.test(host), 'A local FIRESTORE_EMULATOR_HOST is required.');
const suffix = randomUUID();
const eventId = `security-${suffix}`;
const ownerUid = `owner-${suffix}`;
const adminUid = `admin-${suffix}`;
const eventPath = `events/${eventId}`;
const app = initializeApp({ projectId }, `security-review-${suffix}`);
const db = getFirestore(app);

function token(uid: string) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [encode({ alg: 'none', typ: 'JWT' }), encode({
    aud: projectId, iss: `https://securetoken.google.com/${projectId}`,
    sub: uid, user_id: uid, auth_time: now, iat: now, exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: 'password' },
  }), ''].join('.');
}
function fields(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    const encoded = value instanceof Date ? { timestampValue: value.toISOString() }
      : typeof value === 'string' ? { stringValue: value }
      : typeof value === 'boolean' ? { booleanValue: value }
      : typeof value === 'number' ? { integerValue: String(value) }
      : value === null ? { nullValue: null }
      : { mapValue: { fields: fields(value as Record<string, unknown>) } };
    return [key, encoded];
  }));
}
async function request(path: string, uid?: string, patch?: Record<string, unknown>) {
  const mask = patch ? '?' + Object.keys(patch).map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join('&') : '';
  return fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}${mask}`, {
    method: patch ? 'PATCH' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) },
    ...(patch ? { body: JSON.stringify({ fields: fields(patch) }) } : {}),
  });
}
async function expectStatus(response: Response, status: number, label: string) {
  assert.equal(response.status, status, `${label}: ${await response.text()}`);
}

try {
  // Unique fixtures only: never reset, overwrite existing fixtures, or delete data.
  await db.doc(`admin-users/${adminUid}`).create({ enabled: true });
  await db.doc(eventPath).create({
    eventId, slug: eventId, ownerUid, ownerEmail: 'private@example.test',
    ownerDisplayName: 'Private account', title: 'Public event', featureFlags: {},
    visibility: { published: true },
    displayPeriod: { isActive: true, startDate: new Date('2000-01-01'), endDate: new Date('2999-01-01') },
    stats: { ticketCount: 2, ticketBalance: 2 },
  });
  await db.doc(`${eventPath}/content/current`).create({ content: { displayName: 'Public event' } });
  await expectStatus(await request(eventPath), 403, 'Anonymous root read');
  await expectStatus(await request(eventPath, `other-${suffix}`), 403, 'Other customer root read');
  await expectStatus(await request(eventPath, ownerUid), 200, 'Owner root read');
  await expectStatus(await request(eventPath, adminUid), 200, 'Admin root read');
  await expectStatus(await request(`${eventPath}/content/current`), 200, 'Anonymous public content read');
  await expectStatus(await request(eventPath, ownerUid, { displayName: 'Updated public name' }), 200, 'Allowed owner content field');
  for (const patch of [
    { displayPeriod: { isActive: false } },
    { displayPeriod: { isActive: true, startDate: new Date('2000-01-01'), endDate: new Date('3999-01-01') } },
    { visibility: { published: false } },
    { ownerUid: `other-${suffix}` },
    { ownerEmail: 'modified@example.test' },
    { stats: { ticketCount: 99, ticketBalance: 99 } },
    { security: { hasPassword: false } },
    { deletion: { status: 'running' } },
  ]) {
    await expectStatus(await request(eventPath, ownerUid, patch), 403, `Protected field ${Object.keys(patch)[0]}`);
  }
  await expectStatus(await request(eventPath, adminUid, { visibility: { published: false } }), 200, 'Admin visibility update');
  await expectStatus(await request(`${eventPath}/content/current`), 403, 'Private content remains blocked');
  console.log('isolated event security emulator checks passed');
} finally {
  await deleteApp(app);
}
