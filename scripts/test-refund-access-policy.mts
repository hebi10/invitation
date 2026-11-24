import assert from 'node:assert/strict';
import { buildRefundAccessChange, validRefundTransactionId } from '../src/server/refundAccessPolicy.ts';
import { normalizeEventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos';
import { getEventSummaryPublicAccessState } from '../src/lib/invitationPublicAccess';
const id = 'play_' + 'a'.repeat(64);
const grant = { transactionId: id, provider: 'googleplay', kind: 'pageCreation', status: 'fulfilled', productId: 'page_creation_premium',
  appUserId: 'payer', eventId: 'event-refund', createdPageSlug: 'refund-fixture' };
const event = { eventId: 'event-refund', slug: 'refund-fixture', ownerUid: 'payer', status: 'active', visibility: { published: true }, published: true };
const index = { eventId: 'event-refund', slug: 'refund-fixture', status: 'active' };
const now = new Date('2026-11-24T05:00:00Z');
const input = { action: 'hold' as const, id, adminUid: 'admin', grant, event, index, review: null, voidedAt: '2026-11-23T05:00:00Z', now };
const denied = (error: { status?: number }) => error.status === 409;
assert.equal(validRefundTransactionId('../other'), false);
for (const patch of [{ provider: 'revenuecat' }, { status: 'failed' }, { kind: 'periodExtension' }, { productId: 'page_creation_deluxe' }, { eventId: 'other' }]) {
  assert.throws(() => buildRefundAccessChange({ ...input, grant: { ...grant, ...patch } }), denied);
}
for (const patch of [{ ownerUid: 'other-owner' }, { billingAccessHold: 'other' }, { deletion: { status: 'running' } }]) {
  assert.throws(() => buildRefundAccessChange({ ...input, event: { ...event, ...patch } }), denied);
}
assert.throws(() => buildRefundAccessChange({ ...input, index: { ...index, status: 'redirect' } }), denied);
assert.throws(() => buildRefundAccessChange({ ...input, voidedAt: undefined }), denied);
const held = buildRefundAccessChange(input);
assert.equal(held.changed, true);
assert.equal(held.review.state, 'held');
const heldEvent = { ...event, billingAccessHold: id };
assert.equal(buildRefundAccessChange({ ...input, event: heldEvent, review: held.review }).changed, false);
const summary = normalizeEventSummaryRecord('event-refund', heldEvent);
assert.ok(summary);
assert.equal(summary.billingAccessHeld, true);
assert.equal(summary.published, false, 'Even inconsistent public flags must be suppressed while held');
assert.equal(getEventSummaryPublicAccessState(summary).isPublic, false);
const released = buildRefundAccessChange({ ...input, action: 'release', event: heldEvent, review: held.review, releaseReason: 'approved-exception' });
assert.equal(released.changed, true);
assert.equal(released.review.state, 'released');
assert.throws(() => buildRefundAccessChange({ ...input, action: 'release', event: heldEvent, review: held.review }), (error: { status?: number }) => error.status === 400);
assert.throws(() => buildRefundAccessChange({ ...input, action: 'release', event: { ...heldEvent, billingAccessHold: 'other' }, review: held.review, releaseReason: 'record-correction' }), denied);
assert.throws(() => buildRefundAccessChange({ ...input, review: released.review }), denied, 'Reviewed exceptions must not be re-held by replay');
assert.equal(buildRefundAccessChange({ ...input, action: 'release', review: released.review, releaseReason: 'approved-exception' }).changed, false);
console.log('refund access policy checks passed');
