import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { buildDummyEventWritePlan, DUMMY_EVENT_SEEDS } from './seed-dummy-events.mts';
import { createInitialWizardConfig } from '../src/app/page-wizard/pageWizardData.ts';
import { normalizeInvitationConfigSeed } from '../src/lib/invitationPagePersistence.ts';
import { getEventSamplePageBySlug } from '../src/config/eventSamplePages.ts';
import { isOpeningThemeKey, resolveOpeningRouteTheme } from '../src/lib/openingThemes.ts';
import {
  buildInvitationPageConfigRecordFromEventContent,
  buildInvitationPageRegistryRecordFromEventSummary,
  normalizeEventSummaryRecord,
} from '../src/server/repositories/eventReadThroughDtos.ts';

function loadModule<Module>(file: string, dependencies: Record<string, unknown>): Module {
  const exports = {};
  const require = createRequire(new URL(`../${file}`, import.meta.url));
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, require(name: string) {
    if (name in dependencies) return dependencies[name];
    return require(name);
  } });
  return exports as Module;
}

const plan = buildDummyEventWritePlan(DUMMY_EVENT_SEEDS, new Date('2026-10-15T00:00:00Z'));
function storedEvent(slug: string) {
  const eventId = `evt_${slug}`;
  const summary = normalizeEventSummaryRecord(eventId, plan.find(write => write.path === `events/${eventId}`)!.data)!;
  const content = buildInvitationPageConfigRecordFromEventContent(summary,
    plan.find(write => write.path === `events/${eventId}/content/current`)!.data);
  return { summary, content, registry: buildInvitationPageRegistryRecordFromEventSummary(summary) };
}

test('Stored opening, birthday, family and general-event content survives normalization with its own names', () => {
  for (const seed of DUMMY_EVENT_SEEDS) {
    const result = storedEvent(seed.slug);
    assert.ok(result.content, `${seed.slug} must not disappear because it does not have a bride`);
    assert.equal(result.content.config.eventType, seed.eventType);
    assert.equal(result.content.config.displayName, seed.displayName);
    assert.equal(result.content.config.couple.bride.name, seed.couple.bride.name);
  }
});

test('An opening without a static sample reaches its requested public route using persisted content', async () => {
  const slug = 'opening-green-table';
  assert.equal(getEventSamplePageBySlug(slug), null, 'This case must exercise stored content without sample fallback');
  const stored = storedEvent(slug);
  const repository = {
    isAvailable: () => true,
    findRegistryBySlug: async () => stored.registry,
    findContentBySlug: async () => stored.content,
    findDisplayPeriodBySlug: async () => null,
  };
  const service = loadModule<typeof import('../src/server/invitationPageServerService')>(
    'src/server/invitationPageServerService.ts', {
      'server-only': {},
      './repositories/eventRepository': {
        firestoreEventRepository: repository,
        resolveStoredEventBySlug: async () => ({ summary: stored.summary }),
      },
      './invitationContentSavePolicy': {},
    });
  const page = await service.getServerInvitationPageBySlug(slug, { sampleFallbackMode: 'never' });
  assert.ok(page, 'A valid published opening must not become a missing public page');
  assert.equal(page.displayName, '그린테이블 오픈');
  assert.equal(page.eventType, 'opening');
  const route = loadModule<{ default: (props: { params: Promise<{ slug: string; theme: string }> }) => Promise<{ theme: string; initialPageConfig: unknown }> }>(
    'src/app/[slug]/[theme]/page.tsx', {
      'next/navigation': { notFound() { throw new Error('Route unexpectedly returned 404'); } },
      '@/server/invitationPageServerService': service,
      '../serverInvitationPageCache': {
        getCachedServerPublicInvitationPageBySlug: (value: string) => service.getServerInvitationPageBySlug(value, { sampleFallbackMode: 'never' }),
        getCachedServerInvitationPageBySlug: (value: string) => service.getServerInvitationPageBySlug(value, { includePrivate: true, sampleFallbackMode: 'never' }),
      },
      '@/app/_components/eventPageRendererRegistry': { resolveEventPageRenderer(eventType: string) {
        assert.equal(eventType, 'opening');
        return { resolvedEventType: eventType, renderer: {
          isThemeSupported: isOpeningThemeKey, resolveRouteTheme: resolveOpeningRouteTheme,
          renderPage: (options: unknown) => options,
        } };
      } },
    });
  const rendered = await route.default({ params: Promise.resolve({ slug, theme: 'opening-natural' }) });
  assert.equal(rendered.theme, 'opening-natural');
  assert.ok(rendered.initialPageConfig);
  stored.registry.published = false;
  assert.equal(await service.getServerInvitationPageBySlug(slug, { sampleFallbackMode: 'never' }), null,
    'Accepting opening content must not bypass its publication state');
});

test('Empty or malformed event content remains invalid', () => {
  for (const eventType of ['opening', 'general-event', 'birthday', 'wedding', 'first-birthday']) {
    assert.equal(normalizeInvitationConfigSeed('empty-event', { eventType }), null);
    assert.equal(normalizeInvitationConfigSeed('empty-event', { eventType, displayName: '행사 이름' }), null,
      'A label without the required content structure is not a valid invitation');
  }
  const seed = createInitialWizardConfig('opening');
  seed.slug = 'opening-invalid';
  seed.displayName = '개업';
  seed.metadata.images.favicon = '';
  assert.equal(normalizeInvitationConfigSeed(seed.slug, seed), null, 'Favicon validation remains in force');
  const unknown = createInitialWizardConfig('wedding');
  unknown.slug = 'unknown-event';
  unknown.couple.groom.name = '첫 번째 이름';
  unknown.couple.bride.name = '';
  assert.equal(normalizeInvitationConfigSeed(unknown.slug, { ...unknown, eventType: 'unknown' }), null,
    'Unrecognized event types still use the stricter wedding defaults');
});

test('Required names follow the existing editor rules without weakening wedding or family validation', () => {
  for (const eventType of ['opening', 'general-event', 'birthday', 'wedding', 'first-birthday'] as const) {
    const seed = createInitialWizardConfig(eventType);
    seed.slug = 'validation-case';
    seed.displayName = '행사 이름';
    seed.couple.groom.name = eventType === 'opening' || eventType === 'general-event' ? '' : '첫 번째 이름';
    seed.couple.bride.name = eventType === 'wedding' || eventType === 'first-birthday' ? '두 번째 이름' : '';
    assert.ok(normalizeInvitationConfigSeed(seed.slug, seed), `${eventType} must accept the editor's required name fields`);
    if (eventType === 'opening' || eventType === 'general-event') seed.displayName = ' ';
    else seed.couple.groom.name = ' ';
    assert.equal(normalizeInvitationConfigSeed(seed.slug, seed), null, `${eventType} still requires its primary name`);
    if (eventType === 'wedding' || eventType === 'first-birthday') {
      seed.couple.groom.name = '첫 번째 이름';
      seed.couple.bride.name = ' ';
      assert.equal(normalizeInvitationConfigSeed(seed.slug, seed), null, `${eventType} still requires both people`);
    }
  }
});
