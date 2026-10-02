import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { WEDDING_PAGE_SAMPLES } from '../src/config/weddingPages.ts';
import * as eventTypes from '../src/lib/eventTypes.ts';
import * as invitationThemes from '../src/lib/invitationThemes.ts';
import * as invitationVariants from '../src/lib/invitationVariants.ts';
import type { InvitationPageSeed } from '../src/types/invitationPage.ts';
import type { EventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos.ts';
import type { CustomerOwnedEventSummary } from '../src/services/customerEventService.ts';

// Execute the real service modules while replacing only authentication and storage/network I/O.
function loadModule<T>(file: string, dependencies: Record<string, unknown> = {}, globals = {}): T {
  const exports = {};
  const emitted = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(emitted, {
    exports, Date, URL, console, ...globals,
    require(name: string) {
      if (name in dependencies) return dependencies[name];
      if (name === '@/lib/eventTypes') return eventTypes;
      if (name === '@/lib/invitationThemes') return invitationThemes;
      if (name === '@/lib/invitationVariants') return invitationVariants;
      if (name === '@/lib/customerEventPresentation') {
        return loadModule('src/lib/customerEventPresentation.ts');
      }
      if (name === 'server-only') return {};
      return new Proxy({}, { get: (_target, key) => () => {
        throw new Error(`Unexpected dependency call: ${name}.${String(key)}`);
      } });
    },
  });
  return exports as T;
}

const base = WEDDING_PAGE_SAMPLES[0];
const config: InvitationPageSeed = {
  ...base,
  weddingDateTime: { year: 2026, month: 0, day: 2, hour: 14, minute: 0 },
  metadata: { ...base.metadata, images: { ...base.metadata.images, wedding: '/images/full.jpg' } },
  pageData: { ...base.pageData, coverImageThumbnailUrl: ' /images/cover-thumb.jpg ' },
};
const summary: EventSummaryRecord = {
  eventId: 'owned-event', slug: 'owned-invitation', eventType: 'wedding', status: 'active',
  ownerUid: 'customer-1', ownerEmail: null, ownerDisplayName: null, title: '고객 초대장',
  displayName: '고객 초대장', summary: null, supportedVariants: ['simple'], published: true,
  defaultTheme: 'simple', featureFlags: {}, commentCount: 0, ticketCount: 0, ticketBalance: 0,
  security: null, visibility: null, displayPeriod: null, hasCustomContent: true,
  createdAt: null, updatedAt: new Date('2026-01-01T00:00:00Z'), lastSavedAt: null,
  version: 1, migratedFromPageSlug: null,
};
let storedConfig: InvitationPageSeed | null = config;
let configReadCount = 0;
const server = loadModule<{
  listCustomerOwnedEventSummaries(uid: string): Promise<CustomerOwnedEventSummary[]>;
}>('src/server/customerEventsService.ts', {
  './repositories/eventRepository': {
    listStoredEventSummaries: async () => [summary, { ...summary, eventId: 'other-event', ownerUid: 'other-customer' }],
  },
  './invitationPageServerService': {
    getServerEditableInvitationPageConfig: async (slug: string) => {
      assert.equal(slug, summary.slug, 'Only the owned invitation config should be read');
      configReadCount += 1;
      return storedConfig ? { config: storedConfig } : null;
    },
  },
});
const [owned] = await server.listCustomerOwnedEventSummaries('customer-1');
assert.equal(owned.coverImageUrl, '/images/cover-thumb.jpg', 'The customer list must expose the saved cover thumbnail');
assert.equal(owned.eventDateLabel, '2026. 1. 2.', 'January must preserve the existing zero-based month convention');
assert.equal(configReadCount, 1, 'Presentation fields should reuse the existing config read');
assert.equal(owned.published, true);
assert.equal(owned.eventId, 'owned-event');

const presentation = loadModule<{
  getCustomerEventPresentation(value: InvitationPageSeed | null | undefined): {
    coverImageUrl: string | null; eventDateLabel: string | null;
  };
  normalizeCustomerEventCoverImageUrl(value: unknown): string | null;
}>('src/lib/customerEventPresentation.ts');

for (const [date, expected] of [
  [{ year: 2026, month: 11, day: 31, hour: 23, minute: 59 }, '2026. 12. 31.'],
  [{ year: 2028, month: 1, day: 29, hour: 0, minute: 0 }, '2028. 2. 29.'],
  [{ year: 2026, month: 1, day: 29, hour: 14, minute: 0 }, null],
  [{ year: 2026, month: 3, day: 31, hour: 14, minute: 0 }, null],
  [{ year: 2026, month: 12, day: 1, hour: 14, minute: 0 }, null],
  [{ year: 2026, month: -1, day: 1, hour: 14, minute: 0 }, null],
  [{ year: 0, month: 0, day: 0, hour: 0, minute: 0 }, null],
  [{ year: 2026, month: 0, day: 1.5, hour: 14, minute: 0 }, null],
  [{ year: 2026, month: 0, day: 1, hour: 24, minute: 0 }, null],
  [{ year: 2026, month: 0, day: 1, hour: 14, minute: 60 }, null],
] as const) {
  assert.equal(presentation.getCustomerEventPresentation({ ...config, weddingDateTime: date }).eventDateLabel, expected);
}
for (const missing of [null, undefined]) {
  const result = presentation.getCustomerEventPresentation(missing);
  assert.equal(result.coverImageUrl, null);
  assert.equal(result.eventDateLabel, null, 'Missing config must not invent an event date');
}
assert.equal(presentation.getCustomerEventPresentation({ ...config, weddingDateTime: undefined } as never).eventDateLabel, null);
assert.equal(presentation.getCustomerEventPresentation({ ...config, pageData: undefined }).coverImageUrl, '/images/full.jpg');
assert.equal(presentation.getCustomerEventPresentation({
  ...config, pageData: { coverImageThumbnailUrl: 'javascript:alert(1)' },
}).coverImageUrl, '/images/full.jpg', 'Invalid thumbnails must fall back to the saved original');
assert.equal(presentation.getCustomerEventPresentation({
  ...config, pageData: { coverImageThumbnailUrl: ' ' },
  metadata: { ...config.metadata, images: { ...config.metadata.images, wedding: '' } },
}).coverImageUrl, null, 'An invitation without a photo must remain without a photo');
for (const invalid of ['', ' ', null, 12, 'javascript:alert(1)', 'data:image/png;base64,abc', 'blob:sample', '//example.test/photo.jpg', '/\\example.test/photo.jpg', 'not a URL']) {
  assert.equal(presentation.normalizeCustomerEventCoverImageUrl(invalid), null);
}
assert.equal(presentation.normalizeCustomerEventCoverImageUrl(' https://example.test/photo.jpg '), 'https://example.test/photo.jpg');
assert.equal(presentation.normalizeCustomerEventCoverImageUrl('http://example.test/photo.jpg'), 'http://example.test/photo.jpg');

storedConfig = null;
const [withoutConfig] = await server.listCustomerOwnedEventSummaries('customer-1');
assert.equal(withoutConfig.coverImageUrl, null);
assert.equal(withoutConfig.eventDateLabel, null);

let apiEvent: Record<string, unknown> = {
  ...owned, updatedAt: '2026-01-01T00:00:00Z',
  coverImageUrl: ' https://example.test/cover.jpg ', eventDateLabel: ' 2026. 1. 2. ',
};
const client = loadModule<{
  listOwnedCustomerEvents(uid: string): Promise<CustomerOwnedEventSummary[]>;
}>('src/services/customerEventService.ts', {
  '@/services/adminAuth': { getCurrentFirebaseIdToken: async () => 'fixture-id-token' },
}, {
  fetch: async (url: string) => {
    assert.equal(url, '/api/customer/events/');
    return { ok: true, json: async () => ({ success: true, events: [apiEvent] }) };
  },
});
const [normalized] = await client.listOwnedCustomerEvents('customer-1');
assert.equal(normalized.coverImageUrl, 'https://example.test/cover.jpg', 'Client normalization must preserve presentation fields');
assert.equal(normalized.eventDateLabel, '2026. 1. 2.');
apiEvent = { ...apiEvent, coverImageUrl: 'javascript:alert(1)', eventDateLabel: 123 };
const [invalid] = await client.listOwnedCustomerEvents('customer-1');
assert.equal(invalid.coverImageUrl, null);
assert.equal(invalid.eventDateLabel, null);
delete apiEvent.coverImageUrl;
delete apiEvent.eventDateLabel;
const [legacy] = await client.listOwnedCustomerEvents('customer-1');
assert.equal(legacy.coverImageUrl, null, 'Older API responses remain supported');
assert.equal(legacy.eventDateLabel, null);

const demo = loadModule<{
  demoExperienceCustomerDataGateway: { listEvents(uid: string): Promise<CustomerOwnedEventSummary[]> };
}>('src/app/my-invitations/customerDataGateway.ts', {}, {
  fetch: async (url: string) => {
    assert.equal(url, '/api/experience/events');
    return { ok: true, json: async () => ({ events: [{
      eventId: 'demo-event', slug: 'demo-invitation', kind: 'daily-workspace', ownerUid: null,
      published: false, defaultTheme: 'simple', version: 1, config,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    }] }) };
  },
});
const [demoEvent] = await demo.demoExperienceCustomerDataGateway.listEvents('customer-1');
assert.equal(demoEvent.coverImageUrl, '/images/cover-thumb.jpg');
assert.equal(demoEvent.eventDateLabel, '2026. 1. 2.', 'The demo dashboard must use the same date convention');
console.log('Customer event presentation, server/client mapping, and demo gateway checks passed');
