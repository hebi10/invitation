import assert from 'node:assert/strict';

import {
  buildBackfillContentPayload,
  buildBackfillEventId,
  buildBackfillEventSummary,
  buildBillingMirrorPayload,
  normalizeBackfillCommentStatus,
  normalizeBackfillSlug,
} from './backfill-events.mts';

async function main() {
  assert.equal(normalizeBackfillSlug(' Alpha Event '), 'alpha-event');
  assert.equal(buildBackfillEventId('alpha-event'), 'evt_alpha-event');

  const now = new Date('2026-04-22T00:00:00.000Z');
  const summary = buildBackfillEventSummary(
    {
      slug: 'alpha-event',
      config: {
        slug: 'alpha-event',
        displayName: 'Alpha Wedding',
        description: 'Invitation summary',
        productTier: 'premium',
        features: { guestbook: true },
        variants: {
          simple: { available: true },
        },
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-10T00:00:00.000Z'),
      },
      registry: {
        pageSlug: 'alpha-event',
        published: false,
        hasCustomConfig: true,
      },
      displayPeriod: {
        isActive: true,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-05-31T00:00:00.000Z'),
      },
      ticket: {
        ticketCount: 3,
      },
      comments: [
        {
          id: 'comment-1',
          data: {},
        },
      ],
    },
    now
  );

  assert.equal(summary.eventId, 'evt_alpha-event');
  assert.equal(summary.eventType, 'wedding');
  assert.equal(summary.slug, 'alpha-event');
  assert.equal(summary.published, false);
  assert.deepEqual(summary.stats, {
    commentCount: 1,
    ticketCount: 3,
  });

  const content = buildBackfillContentPayload(
    'alpha-event',
    {
      slug: 'alpha-event',
      displayName: 'Alpha Wedding',
      createdAt: now,
      updatedAt: now,
      editorTokenHash: 'legacy-token',
      seedSourceSlug: 'sample',
    },
    summary
  );

  assert.equal(content.slug, 'alpha-event');
  assert.equal((content.content as Record<string, unknown>).editorTokenHash, undefined);
  assert.equal((content.content as Record<string, unknown>).seedSourceSlug, undefined);

  assert.equal(normalizeBackfillCommentStatus({ deleted: true }), 'pending_delete');
  assert.equal(normalizeBackfillCommentStatus({ status: 'hidden' }), 'hidden');

  const billingPayload = buildBillingMirrorPayload({
    transactionId: 'tx-1',
    createdPageSlug: 'alpha-event',
    targetPageSlug: 'beta-event',
  });
  assert.equal(billingPayload.createdEventId, 'evt_alpha-event');
  assert.equal(billingPayload.targetEventId, 'evt_beta-event');
  assert.equal(billingPayload.migratedFromCollection, 'mobile-billing-fulfillments');

  console.log('event backfill planner checks passed');
}

void main();
