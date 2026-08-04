import assert from 'node:assert/strict';

import { getEventSamplePageBySlug } from '../src/config/eventSamplePages.ts';
import {
  buildAdminInvitationPageSummary,
  resolveAdminInvitationPage,
} from '../src/server/adminInvitationPagesService.ts';
import type {
  EventContentRecordDto,
  EventSummaryRecord,
} from '../src/server/repositories/eventReadThroughDtos.ts';

function makeSummary(overrides: Partial<EventSummaryRecord> = {}): EventSummaryRecord {
  return {
    eventId: 'event-opening-bloom-cafe',
    slug: 'opening-bloom-cafe',
    eventType: 'opening',
    status: 'active',
    ownerUid: null,
    ownerEmail: null,
    ownerDisplayName: null,
    title: '블룸 카페 운영본',
    displayName: '블룸 카페 운영본',
    summary: null,
    supportedVariants: ['opening-natural'],
    published: true,
    defaultTheme: 'opening-natural',
    featureFlags: {},
    commentCount: 0,
    ticketCount: 0,
    ticketBalance: 0,
    security: null,
    visibility: null,
    displayPeriod: null,
    hasCustomContent: false,
    createdAt: null,
    updatedAt: null,
    lastSavedAt: null,
    version: 1,
    migratedFromPageSlug: null,
    ...overrides,
  };
}

const summary = makeSummary();
const fallback = resolveAdminInvitationPage(summary, null);

assert.equal(fallback.source, 'sample');
assert.equal(fallback.page?.date, '2026년 5월 18일 월요일');
assert.equal(fallback.page?.venue, '블룸 카페 성수');

const fallbackSummary = buildAdminInvitationPageSummary(
  summary,
  fallback.page,
  new Set(),
  fallback.source
);

assert.equal(fallbackSummary.displayName, '블룸 카페 운영본');
assert.equal(fallbackSummary.date, '2026년 5월 18일 월요일');
assert.equal(fallbackSummary.venue, '블룸 카페 성수');

const sample = getEventSamplePageBySlug(summary.slug);
assert.ok(sample);

const storedRecord: EventContentRecordDto = {
  slug: summary.slug,
  config: {
    ...sample,
    displayName: '사용자 저장 이름',
    date: '2027년 1월 2일',
    venue: '사용자 저장 장소',
  },
  createdAt: null,
  updatedAt: null,
  seedSourceSlug: null,
};
const stored = resolveAdminInvitationPage(summary, storedRecord);

assert.equal(stored.source, 'stored');
assert.equal(stored.page?.displayName, '사용자 저장 이름');
assert.equal(stored.page?.date, '2027년 1월 2일');
assert.equal(stored.page?.venue, '사용자 저장 장소');

const storedSummary = buildAdminInvitationPageSummary(
  summary,
  stored.page,
  new Set(),
  stored.source
);

assert.equal(storedSummary.displayName, '사용자 저장 이름');
assert.equal(storedSummary.date, '2027년 1월 2일');
assert.equal(storedSummary.venue, '사용자 저장 장소');

const unknown = resolveAdminInvitationPage(
  makeSummary({
    eventId: 'event-unknown',
    slug: 'unknown-event',
    eventType: 'general-event',
    displayName: '알 수 없는 행사',
    title: '알 수 없는 행사',
  }),
  null
);

assert.deepEqual(unknown, { page: null, source: 'none' });

console.log('admin invitation summary checks passed');
