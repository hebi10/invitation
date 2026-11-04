import assert from 'node:assert/strict';
import { resolveInvitationFeatures, normalizeInvitationProductTier, buildInvitationTemplateDefinitions } from '../src/lib/invitationProducts.ts';

for (const legacyTier of ['standard', 'deluxe'] as const) {
  assert.equal(normalizeInvitationProductTier(legacyTier), legacyTier, 'stored tier stays compatible with historical records');
  assert.deepEqual(resolveInvitationFeatures(legacyTier, {
    maxGalleryImages: 6, showGuestbook: false, showCountdown: false, showMusic: false, shareMode: 'link',
  }), resolveInvitationFeatures('premium'), 'legacy tier limits must not disable included features');
}
assert.ok(buildInvitationTemplateDefinitions('sample').every((template) => template.productTier === 'premium'));
assert.ok(buildInvitationTemplateDefinitions('sample').every((template) => !/STANDARD|DELUXE|PREMIUM/.test(template.displayName)));

assert.equal(resolveInvitationFeatures('premium', { showGuestbook: false }).showGuestbook, false, 'explicit content controls remain supported');
console.log('Invitation product policy passed.');

// Exercise both creation services with only their persistence boundaries replaced.
const { readFileSync } = await import('node:fs');
const { createRequire } = await import('node:module');
const { runInNewContext } = await import('node:vm');
const { default: ts } = await import('typescript');
const { getAllWeddingPageSeeds } = await import('../src/config/weddingPages.ts');
const { getWeddingPreviewThemeKeys } = await import('../src/lib/eventPreviewLinks.ts');

type Period = { isActive?: boolean; startDate?: Date; endDate?: Date; displayPeriodEnabled?: boolean; displayPeriodStart?: Date; displayPeriodEnd?: Date };
const legacySeed = structuredClone(getAllWeddingPageSeeds()[0]!);
legacySeed.productTier = 'standard';
legacySeed.features = { maxGalleryImages: 6, showGuestbook: false, showCountdown: false, showMusic: false, shareMode: 'link' };
function creationFixture(side: 'server' | 'pc', createdAt = new Date('2026-08-31T12:00:00Z')) {
  class CreationDate extends Date {
    constructor(value?: string | number | Date) { super(value === undefined ? createdAt.getTime() : new Date(value).getTime()); }
  }
  const file = side === 'server' ? '../src/server/invitationPageServerService.ts' : '../src/services/invitationPageService.ts';
  const sourceUrl = new URL(file, import.meta.url);
  const nativeRequire = createRequire(sourceUrl);
  const source = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let period: Period | undefined;
  let saved: { config: typeof legacySeed; published: boolean } | undefined;
  const exports: Record<string, unknown> = {};
  const repository = {
    isAvailable: () => true,
    isSlugTaken: async () => false,
    createUniqueSlug: async (slug: string) => slug,
    saveContentBySlug: async (value: typeof saved) => { saved = value; return 1; },
    saveConfig: async (value: typeof saved) => { saved = value; return 1; },
    upsertDisplayPeriodBySlug: async (_slug: string, value: Period) => { period = value; },
    syncDisplayPeriodBySlug: async (_slug: string, value: Period) => { period = value; },
  };
  runInNewContext(source, {
    exports, Date: CreationDate,
    require(id: string) {
      if (id === 'server-only') return {};
      if (id === '@/config/weddingPages') return { ...nativeRequire(id), getWeddingPageBySlug: () => legacySeed };
      if (id === './repositories/eventRepository') return { firestoreEventRepository: repository };
      if (id === '@/services/repositories/invitationPageRepository') return { clientInvitationPageRepository: repository };
      return nativeRequire(id);
    },
  });
  const create = exports[side === 'server' ? 'createServerInvitationPageDraftFromSeed' : 'createInvitationPageDraftFromSeed'] as (
    input: { seedSlug: string; slugBase: string; productTier?: 'standard' | 'deluxe' | 'premium' }
  ) => Promise<{ config: typeof legacySeed }>;
  return { create, period: () => period, saved: () => saved };
}

for (const side of ['server', 'pc'] as const) {
  for (const tier of ['standard', 'deluxe', 'premium'] as const) {
    const fixture = creationFixture(side);
    const result = await fixture.create({ seedSlug: legacySeed.slug, slugBase: 'policy-page', productTier: tier });
    assert.equal(result.config.productTier, 'premium', `${side}: 신규 생성에는 과거 등급을 저장하면 안 됩니다.`);
    assert.deepEqual(result.config.features, {
      maxGalleryImages: 18, showGuestbook: true, showCountdown: true, showMusic: true, shareMode: 'card',
    }, `${side}: 과거 템플릿에 저장된 기능 제한을 새 상품에 복사하면 안 됩니다.`);
    const period = fixture.period();
    assert.ok(period, `${side}: 신규 생성 기본 이용 기간을 저장해야 합니다.`);
    assert.equal((period.startDate ?? period.displayPeriodStart)?.toISOString(), '2026-08-31T12:00:00.000Z');
    assert.equal((period.endDate ?? period.displayPeriodEnd)?.toISOString(), '2027-02-28T12:00:00.000Z', `${side}: 6개월 뒤에 같은 날짜가 없으면 해당 월 마지막 날로 제한해야 합니다.`);
    assert.equal(fixture.saved()?.published, false, `${side}: 기간 설정만으로 비공개 초안을 공개하면 안 됩니다.`);
    assert.ok(getWeddingPreviewThemeKeys().every(theme => result.config.variants?.[theme]?.available === true), `${side}: 기존 웨딩 디자인 6개를 모두 사용할 수 있어야 합니다.`);
  }
}
console.log('Server and PC premium creation, six-month defaults and legacy feature isolation passed.');

const { mergeInvitationPageSeed } = await import('../src/lib/invitationPagePersistence.ts');
for (const tier of ['standard', 'deluxe'] as const) {
  const restored = mergeInvitationPageSeed(legacySeed, { ...legacySeed, productTier: tier });
  assert.ok(restored);
  assert.equal(restored.productTier, tier, '과거 저장 등급은 호환성을 위해 유지합니다.');
  assert.deepEqual(restored.features, {
    maxGalleryImages: 18, showGuestbook: true, showCountdown: true, showMusic: true, shareMode: 'card',
  }, '저장된 과거 청첩장도 현재 프리미엄 기능을 읽어야 합니다.');
}

for (const side of ['server', 'pc'] as const) {
  for (const [start, end] of [
    ['2023-08-31T09:14:15.678Z', '2024-02-29T09:14:15.678Z'],
    ['2024-02-29T09:14:15.678Z', '2024-08-29T09:14:15.678Z'],
  ]) {
    const fixture = creationFixture(side, new Date(start));
    await fixture.create({ seedSlug: legacySeed.slug, slugBase: 'calendar-page' });
    const period = fixture.period();
    assert.equal((period?.endDate ?? period?.displayPeriodEnd)?.toISOString(), end, `${side}: 윤년과 UTC 시각을 유지한 달력 기준 6개월이어야 합니다.`);
  }
}
