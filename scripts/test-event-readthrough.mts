import assert from 'node:assert/strict';

import {
  buildInvitationPageConfigRecordFromEventContent,
  buildInvitationPageDisplayPeriodRecordFromEventSummary,
  normalizeEventSlugIndexRecord,
  normalizeEventSummaryRecord,
} from '../src/server/repositories/eventReadThroughDtos.ts';
import { loadReadThroughValue } from '../src/server/repositories/readThrough.ts';

async function main() {
  const originalFallbackFlag = process.env.EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK;

  let fallbackCalled = false;
  const preferredValue = await loadReadThroughValue({
    preferred: async () => 'events-record',
    fallback: async () => {
      fallbackCalled = true;
      return 'legacy-record';
    },
  });

  assert.equal(preferredValue, 'events-record');
  assert.equal(fallbackCalled, false);

  process.env.EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK = 'true';
  const fallbackValue = await loadReadThroughValue({
    preferred: async () => null,
    fallback: async () => 'legacy-record',
  });
  assert.equal(fallbackValue, 'legacy-record');

  process.env.EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK = 'false';
  const disabledFallbackValue = await loadReadThroughValue({
    preferred: async () => null,
    fallback: async () => 'legacy-record',
  });
  assert.equal(disabledFallbackValue, null);

  if (originalFallbackFlag === undefined) {
    delete process.env.EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK;
  } else {
    process.env.EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK = originalFallbackFlag;
  }

  const summary = normalizeEventSummaryRecord('event-123', {
    slug: 'alpha-event',
    eventType: 'wedding',
    published: true,
    defaultTheme: 'simple',
    hasCustomContent: true,
    displayPeriod: {
      isActive: true,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-30T23:59:59.000Z',
    },
  });
  assert.ok(summary);

  const displayPeriod = buildInvitationPageDisplayPeriodRecordFromEventSummary(summary);
  assert.ok(displayPeriod);
  assert.equal(displayPeriod?.docId, 'event-123');
  assert.equal(displayPeriod?.pageSlug, 'alpha-event');
  assert.equal(displayPeriod?.isActive, true);

  const configRecord = buildInvitationPageConfigRecordFromEventContent(summary, {
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
    themeState: {
      defaultTheme: 'simple',
    },
    content: {
      slug: 'alpha-event',
      displayName: '민수 지연 결혼식',
      description: '초대합니다.',
      date: '2026-06-20',
      venue: '테스트 웨딩홀',
      couple: {
        groom: { name: '민수' },
        bride: { name: '지연' },
      },
      metadata: {
        images: {
          favicon: '/favicon.png',
        },
      },
    },
  });
  assert.ok(configRecord);
  assert.equal(configRecord?.slug, 'alpha-event');
  assert.equal(configRecord?.config.slug, 'alpha-event');
  assert.equal(configRecord?.config.couple.groom.name, '민수');
  assert.equal(configRecord?.config.couple.bride.name, '지연');

  const slugIndex = normalizeEventSlugIndexRecord('alpha-event', {
    eventId: 'event-123',
    status: 'redirect',
    targetSlug: 'beta-event',
  });
  assert.deepEqual(slugIndex, {
    slug: 'alpha-event',
    eventId: 'event-123',
    eventType: null,
    status: 'redirect',
    targetSlug: 'beta-event',
    createdAt: null,
    updatedAt: null,
  });

  console.log('event read-through checks passed');
}

void main();
