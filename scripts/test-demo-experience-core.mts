import assert from 'node:assert/strict';

import {
  getKstDateKey,
  getNextKstMidnight,
  isDemoExperienceDateExpired,
} from '@/lib/demoExperienceTime';
import { buildAppRoutes } from '@/lib/demoExperienceRoutes';
import { createDemoExperienceSeedEvents, DEMO_EXPERIENCE_DAILY_SLUG } from '@/config/demoExperienceSeeds';
import { beginDemoDailyWorkspace, prepareDemoDailyWorkspace, saveDemoDailyWorkspace } from '@/server/demoExperienceService';
import { DemoExperienceVersionConflictError, type DemoExperienceRepository } from '@/server/repositories/demoExperienceRepository';
import type { DemoExperienceStoredEvent } from '@/types/demoExperience';
import { buildStepValidation, type WizardStepKey } from '@/app/page-wizard/pageWizardData';

assert.equal(getKstDateKey(new Date('2026-08-02T14:59:59.000Z')), '2026-08-02');
assert.equal(getKstDateKey(new Date('2026-08-02T15:00:00.000Z')), '2026-08-03');
assert.equal(
  getNextKstMidnight(new Date('2026-08-02T15:00:00.000Z')).toISOString(),
  '2026-08-03T15:00:00.000Z'
);
assert.equal(
  isDemoExperienceDateExpired('2026-08-02', new Date('2026-08-02T15:00:00.000Z')),
  true
);

const experience = buildAppRoutes('experience');
assert.equal(experience.admin(), '/experience/admin');
assert.equal(experience.customerDashboard(), '/experience/my-invitations');
assert.equal(experience.wizardCreate('wedding'), '/experience/page-wizard');
assert.equal(
  experience.wizardEdit('daily-experience-wedding'),
  '/experience/page-wizard/daily-experience-wedding'
);
assert.equal(
  experience.preview('daily-experience-wedding', 'romantic'),
  '/experience/preview/daily-experience-wedding/romantic'
);

const production = buildAppRoutes('production');
assert.equal(production.admin(), '/admin');
assert.equal(production.customerDashboard(), '/my-invitations');
assert.equal(production.wizardEdit('sample'), '/page-wizard/sample');
assert.equal(production.preview('sample', 'romantic'), '/sample/romantic');

const workspaces = new Map<string, DemoExperienceStoredEvent>();
let writes = 0;
const repository = {
  async bootstrapDate() {},
  async findEventBySlug(dateKey: string, slug: string) {
    if (slug === DEMO_EXPERIENCE_DAILY_SLUG) return workspaces.get(dateKey) ?? null;
    return createDemoExperienceSeedEvents(dateKey).find((seed) => seed.slug === slug) ?? null;
  },
  async saveDailyWorkspace(input) {
    const current = workspaces.get(input.dateKey);
    if ((current?.version ?? 0) !== input.expectedVersion) {
      throw new DemoExperienceVersionConflictError(current!.version);
    }
    const saved: DemoExperienceStoredEvent = {
      eventId: 'daily-workspace', slug: input.slug, kind: 'daily-workspace',
      ownerUid: 'demo-daily-customer', config: input.config, published: input.published,
      defaultTheme: input.defaultTheme, version: input.expectedVersion + 1,
      createdAt: new Date(), updatedAt: new Date(),
    };
    workspaces.set(input.dateKey, saved);
    writes += 1;
    return saved;
  },
} as DemoExperienceRepository;
const beforeMidnight = new Date('2026-09-11T14:59:59Z');
const concurrentStarts = await Promise.all(
  Array.from({ length: 8 }, () => prepareDemoDailyWorkspace(beforeMidnight, repository))
);
assert.equal(writes, 1, 'concurrent starts create exactly one daily workspace');
assert.ok(concurrentStarts.every((result) => result.version === 1));
const firstWorkspace = concurrentStarts[0];
assert.equal(firstWorkspace.editableConfig.defaultTheme, 'simple');
assert.equal(firstWorkspace.editableConfig.published, false);
assert.equal(firstWorkspace.editableConfig.config.pageData?.galleryImages?.length, 4);
const prepared = firstWorkspace.editableConfig.config;
assert.equal(prepared.pageData?.greetingAuthor, `${prepared.groomName} · ${prepared.brideName}`);
assert.equal(prepared.pageData?.giftInfo?.groomAccounts?.[0].accountHolder, prepared.groomName);
assert.equal(prepared.pageData?.kakaoMap?.markerTitle, prepared.venue);
assert.doesNotMatch(JSON.stringify(prepared), /김민준|박소희|더케이웨딩홀/);
for (const key of ['eventType', 'theme', 'slug', 'basic', 'schedule', 'venue', 'greeting', 'extra', 'music', 'final'] satisfies WizardStepKey[]) {
  const validation = buildStepValidation(key, firstWorkspace.editableConfig.defaultTheme, prepared, {
    slugInput: prepared.slug, persistedSlug: prepared.slug,
    groomKoreanName: prepared.groomName, brideKoreanName: prepared.brideName,
    groomEnglishName: '', brideEnglishName: '',
  });
  assert.equal(validation.valid, true, `${key}: ${validation.messages.join(', ')}`);
}
const editedConfig = structuredClone(firstWorkspace.editableConfig.config);
editedConfig.groomName = '수정한 이름';
await saveDemoDailyWorkspace({
  slug: DEMO_EXPERIENCE_DAILY_SLUG, expectedVersion: 1, config: editedConfig,
  published: true, defaultTheme: 'simple',
}, beforeMidnight, repository);
const resumed = await prepareDemoDailyWorkspace(beforeMidnight, repository);
assert.equal(resumed.version, 2);
assert.equal(resumed.editableConfig.config.groomName, '수정한 이름');
const repeatedDraft = await beginDemoDailyWorkspace('demo-seed-01', beforeMidnight, repository);
assert.equal(repeatedDraft.editableConfig.config.groomName, '수정한 이름');
await assert.rejects(saveDemoDailyWorkspace({
  slug: DEMO_EXPERIENCE_DAILY_SLUG, expectedVersion: 1, config: editedConfig,
  published: true, defaultTheme: 'simple',
}, beforeMidnight, repository), DemoExperienceVersionConflictError);
const nextDay = await prepareDemoDailyWorkspace(new Date('2026-09-11T15:00:00Z'), repository);
assert.equal(nextDay.dateKey, '2026-09-12');
assert.equal(nextDay.version, 1);
assert.notEqual(nextDay.editableConfig.config.groomName, '수정한 이름');
assert.equal(workspaces.size, 2);

const legacyStored = workspaces.get('2026-09-11')!;
legacyStored.config.metadata.images.wedding = '/images/001.png';
legacyStored.config.metadata.images.social = '/images/001.png';
legacyStored.config.pageData!.galleryImages = ['/images/001.png'];
legacyStored.config.pageData!.galleryImageThumbnailUrls = ['/images/001.png'];
const legacyBefore = structuredClone(legacyStored);
const writesBeforeRead = writes;
const legacyRead = await prepareDemoDailyWorkspace(beforeMidnight, repository);
assert.deepEqual(legacyStored, legacyBefore, 'reading legacy images must not mutate stored customer input');
assert.equal(writes, writesBeforeRead, 'reading legacy images must not write the workspace');
assert.equal(legacyRead.editableConfig.config.metadata.images.wedding, '/images/experience/cover.webp');
assert.equal(legacyRead.editableConfig.config.groomName, '수정한 이름');
assert.equal(legacyRead.editableConfig.config.pageData?.galleryImages?.length, 4);
assert.ok(!legacyRead.editableConfig.config.pageData?.galleryImages?.includes('/images/experience/cover.webp'));
assert.deepEqual(legacyRead.editableConfig.config.pageData?.galleryImageThumbnailUrls, legacyRead.editableConfig.config.pageData?.galleryImages);
const legacySave = await saveDemoDailyWorkspace({
  slug: DEMO_EXPERIENCE_DAILY_SLUG, expectedVersion: 2, config: legacyBefore.config,
  published: true, defaultTheme: 'simple',
}, beforeMidnight, repository);
assert.equal(legacySave.version, 3);
assert.equal(legacySave.editableConfig.config.metadata.images.wedding, '/images/experience/cover.webp');
assert.equal(legacySave.editableConfig.config.groomName, '수정한 이름');
const rejectedImages = structuredClone(legacySave.editableConfig.config);
rejectedImages.metadata.images.wedding = '/images/unapproved.png';
await assert.rejects(saveDemoDailyWorkspace({
  slug: DEMO_EXPERIENCE_DAILY_SLUG, expectedVersion: 3, config: rejectedImages,
  published: true, defaultTheme: 'simple',
}, beforeMidnight, repository), /제공된 샘플 이미지/);

console.log('demo experience core checks passed');
