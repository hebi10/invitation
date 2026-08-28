import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  SHORTCUT_ITEMS,
  getPageCategoryPreviewLinks,
} from '../src/app/admin/_components/adminPageUtils.ts';
import {
  buildEventPreviewPath,
  getEventPreviewLinks,
} from '../src/lib/eventPreviewLinks.ts';
import {
  getInvitationThemeDefinition,
  getInvitationThemePreviewSampleUrl,
  getInvitationThemeSalesPolicy,
  type InvitationThemeKey,
  type InvitationThemePreviewProductTier,
} from '../src/lib/invitationThemes.ts';
import { BIRTHDAY_THEME_META } from '../src/lib/birthdayThemes.ts';
import { getGeneralEventTheme } from '../src/lib/generalEventThemes.ts';
import { getOpeningTheme } from '../src/lib/openingThemes.ts';
import { getEventSamplePageBySlug } from '../src/config/eventSamplePages.ts';
import {
  DEFAULT_PUBLIC_SITE_URL,
  getPublicSiteUrl,
} from '../src/lib/invitationMetadata.ts';
import { DUMMY_EVENT_SEEDS } from './seed-dummy-events.mts';

assert.deepEqual(
  SHORTCUT_ITEMS.map((item) => item.key),
  ['emotional', 'romantic', 'simple', 'classic-r']
);

const expectedInvitationThemeMetadata = [
  ['emotional', '포트레이트 레터', '세로 사진과 짧은 편지가 중심인 여백형 웨딩입니다.', '/emotional'],
  ['romantic', '가든 노트', '한 줄 식물 장식과 편지형 인사말, 가족 연락 흐름을 담은 웨딩입니다.', '/romantic'],
  ['simple', '고요한 예식', '일정·장소를 우선하는 절제된 정보 인쇄물입니다.', '/simple'],
  ['classic-r', '레터프레스', '고전 활자와 얇은 선, 종이 인쇄물 같은 웨딩입니다.', '/classic-r'],
  ['first-birthday-pink', '퍼스트 챕터', '아이 이름·날짜·성장 한 장면을 기록하는 첫 돌입니다.', '/first-birthday-pink'],
  ['first-birthday-mint', '새벽 챕터', '차분한 여백과 날짜 기록 중심의 첫 돌입니다.', '/first-birthday-mint'],
  ['birthday-minimal', '파티 노트', '일정·장소·연락처를 우선하는 생일 파티 메모입니다.', '/birthday-minimal'],
  ['birthday-floral', '생일 이야기', '사진과 축하 문장을 중심으로 한 짧은 생일 기록입니다.', '/birthday-floral'],
  ['opening-natural', '스튜디오 오프닝', '브랜드 소개·서비스·혜택·방문 정보가 이어지는 소개서입니다.', '/opening-natural'],
  ['opening-modern', '오프닝 포스터', '상호·오픈일·방문 행동을 대담하게 조판한 포스터입니다.', '/opening-modern'],
  ['general-event-elegant', '프로그램 에디션', '행사 정보와 세로 프로그램을 정돈한 격식 있는 에디션입니다.', '/general-event-elegant'],
  ['general-event-vivid', '나이트 스케줄', '야간 행사명과 세로 프로그램을 선명하게 보여주는 일정 포스터입니다.', '/general-event-vivid'],
] as const satisfies ReadonlyArray<readonly [InvitationThemeKey, string, string, string]>;

for (const [theme, label, description, pathSuffix] of expectedInvitationThemeMetadata) {
  const definition = getInvitationThemeDefinition(theme);

  assert.equal(definition.label, label, `${theme} must use its renewed display label`);
  assert.equal(definition.adminLabel, label, `${theme} admin label must match its display label`);
  assert.equal(
    definition.variantLabel,
    label,
    `${theme} variant label must match its display label`
  );
  assert.equal(
    definition.wizardDescription,
    description,
    `${theme} wizard description must describe its dedicated visual world`
  );
  assert.equal(
    definition.preview.description,
    description,
    `${theme} preview description must describe its dedicated visual world`
  );
  assert.equal(definition.pathSuffix, pathSuffix, `${theme} must preserve its public path suffix`);
}

assert.deepEqual(BIRTHDAY_THEME_META['birthday-minimal'], {
  label: '파티 노트',
  description: '일정·장소·연락처를 우선하는 생일 파티 메모입니다.',
});
assert.deepEqual(BIRTHDAY_THEME_META['birthday-floral'], {
  label: '생일 이야기',
  description: '사진과 축하 문장을 중심으로 한 짧은 생일 기록입니다.',
});
assert.equal(getOpeningTheme('opening-natural').label, '스튜디오 오프닝');
assert.equal(getOpeningTheme('opening-modern').label, '오프닝 포스터');
assert.equal(getGeneralEventTheme('general-event-elegant').label, '프로그램 에디션');
assert.equal(getGeneralEventTheme('general-event-vivid').label, '나이트 스케줄');

const firstBirthdayLinks = getPageCategoryPreviewLinks('first-birthday', {
  slug: 'first-birthday-ian-spring',
});

assert.deepEqual(
  firstBirthdayLinks.map((link) => link.path),
  [
    '/first-birthday-ian-spring/first-birthday-pink',
    '/first-birthday-ian-spring/first-birthday-mint',
  ]
);
assert.equal(
  firstBirthdayLinks.some((link) => link.path.includes('/emotional')),
  false
);

const openingLinks = getPageCategoryPreviewLinks('opening', {
  slug: 'opening-bloom-cafe',
});
assert.deepEqual(
  openingLinks.map((link) => link.path),
  ['/opening-bloom-cafe/opening-natural', '/opening-bloom-cafe/opening-modern']
);

const birthdayLinks = getPageCategoryPreviewLinks('birthday', {
  slug: 'birthday-minseo-picnic',
});
assert.deepEqual(
  birthdayLinks.map((link) => link.path),
  [
    '/birthday-minseo-picnic/birthday-minimal',
    '/birthday-minseo-picnic/birthday-floral',
  ]
);

const generalEventLinks = getPageCategoryPreviewLinks('general-event', {
  slug: 'general-event-brand-night',
});
assert.deepEqual(
  generalEventLinks.map((link) => link.path),
  [
    '/general-event-brand-night/general-event-elegant',
    '/general-event-brand-night/general-event-vivid',
  ]
);

assert.equal(
  buildEventPreviewPath('birthday-minseo-picnic', 'birthday', 'emotional'),
  '/birthday-minseo-picnic/birthday-minimal'
);
assert.equal(
  buildEventPreviewPath('general-event-brand-night', 'general-event', 'emotional'),
  '/general-event-brand-night/general-event-elegant'
);
assert.equal(
  buildEventPreviewPath('opening-bloom-cafe', 'opening', 'emotional'),
  '/opening-bloom-cafe/opening-natural'
);

const customerBirthdayLinks = getEventPreviewLinks({
  slug: 'birthday-minseo-picnic',
  eventType: 'birthday',
  availableThemes: ['emotional'],
  defaultTheme: 'emotional',
});
assert.deepEqual(
  customerBirthdayLinks.map((link) => link.href),
  [
    '/birthday-minseo-picnic/birthday-minimal',
    '/birthday-minseo-picnic/birthday-floral',
  ]
);

const seededSlugs = new Set(DUMMY_EVENT_SEEDS.map((seed) => seed.slug));
const previewProductTiers: InvitationThemePreviewProductTier[] = [
  'standard',
  'deluxe',
  'premium',
];
const expectedWeddingPreviewSamplePaths: Array<
  [InvitationThemeKey, InvitationThemePreviewProductTier, string]
> = [
  ['emotional', 'standard', '/kim-taehyun-choi-yuna/emotional/'],
  ['emotional', 'deluxe', '/lee-junho-park-somin/emotional/'],
  ['emotional', 'premium', '/an-doyoung-yoon-jisoo/emotional/'],
  ['romantic', 'standard', '/kim-taehyun-choi-yuna/romantic/'],
  ['romantic', 'deluxe', '/lee-junho-park-somin/romantic/'],
  ['romantic', 'premium', '/an-doyoung-yoon-jisoo/romantic/'],
  ['simple', 'standard', '/kim-taehyun-choi-yuna/simple/'],
  ['simple', 'deluxe', '/lee-junho-park-somin/simple/'],
  ['simple', 'premium', '/an-doyoung-yoon-jisoo/simple/'],
  ['classic-r', 'standard', '/kim-taehyun-choi-yuna/classic-r/'],
  ['classic-r', 'deluxe', '/lee-junho-park-somin/classic-r/'],
  ['classic-r', 'premium', '/an-doyoung-yoon-jisoo/classic-r/'],
];

for (const [theme, productTier, expectedPath] of expectedWeddingPreviewSamplePaths) {
  const sampleUrl = getInvitationThemePreviewSampleUrl(theme, productTier);
  assert.ok(sampleUrl, `${theme} should have a ${productTier} sample URL`);
  assert.equal(new URL(sampleUrl).pathname, expectedPath);
}

const expectedPreviewSamplePaths: Array<[InvitationThemeKey, string]> = [
  ['first-birthday-pink', '/first-birthday-ian-spring/first-birthday-pink/'],
  ['first-birthday-mint', '/first-birthday-seoah-mint/first-birthday-mint/'],
  ['birthday-minimal', '/birthday-minseo-picnic/birthday-minimal/'],
  ['birthday-floral', '/birthday-jiwoo-rooftop/birthday-floral/'],
  ['general-event-elegant', '/general-event-brand-night/general-event-elegant/'],
  [
    'general-event-vivid',
    '/general-event-summer-networking/general-event-vivid/',
  ],
  ['opening-natural', '/opening-bloom-cafe/opening-natural/'],
  ['opening-modern', '/opening-studio-nova/opening-modern/'],
];

for (const [theme, expectedPath] of expectedPreviewSamplePaths) {
  for (const productTier of previewProductTiers) {
    const sampleUrl = getInvitationThemePreviewSampleUrl(theme, productTier);
    assert.ok(sampleUrl, `${theme} should have a ${productTier} sample URL`);

    const parsedUrl = new URL(sampleUrl);
    assert.equal(parsedUrl.pathname, expectedPath);

    const slug = parsedUrl.pathname.split('/').filter(Boolean)[0];
    assert.equal(
      seededSlugs.has(slug),
      true,
      `${theme} ${productTier} sample slug should exist in dummy event seeds`
    );
    assert.ok(
      getEventSamplePageBySlug(slug),
      `${theme} ${productTier} sample slug should have a runtime public fallback`
    );
  }
}

for (const theme of ['emotional', 'romantic', 'simple', 'classic-r'] as const) {
  assert.deepEqual(getInvitationThemeSalesPolicy(theme), {
    isDefault: theme === 'emotional',
    canBeDefault: true,
    isSelectableAtCreation: true,
    isPurchasable: true,
    allowsAdditionalPurchase: true,
  });
}

for (const theme of [
  'first-birthday-pink',
  'first-birthday-mint',
  'birthday-minimal',
  'birthday-floral',
  'general-event-elegant',
  'general-event-vivid',
  'opening-natural',
  'opening-modern',
] as const) {
  assert.deepEqual(getInvitationThemeSalesPolicy(theme), {
    isDefault: false,
    canBeDefault: true,
    isSelectableAtCreation: false,
    isPurchasable: false,
    allowsAdditionalPurchase: false,
  });
}

function resolveNpxCliPath() {
  const nodeDirectory = path.dirname(process.execPath);
  const candidates = [
    process.env.npm_execpath
      ? path.join(path.dirname(process.env.npm_execpath), 'npx-cli.js')
      : null,
    path.join(nodeDirectory, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.resolve(nodeDirectory, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ];

  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

const npxCliPath = resolveNpxCliPath();
assert.ok(npxCliPath, 'the project test runner must provide the npx CLI.');

function getFreshThemePreviewUrl(publicSiteUrl?: string) {
  const env = { ...process.env };
  const temporaryDirectory = mkdtempSync(
    path.join(tmpdir(), 'invitation-theme-preview-url-')
  );
  const scriptPath = path.join(temporaryDirectory, 'preview-url.mts');
  const invitationThemesModuleUrl = pathToFileURL(
    path.resolve('src/lib/invitationThemes.ts')
  ).href;

  if (publicSiteUrl === undefined) {
    delete env.NEXT_PUBLIC_SITE_URL;
  } else {
    env.NEXT_PUBLIC_SITE_URL = publicSiteUrl;
  }

  try {
    writeFileSync(
      scriptPath,
      [
        `import { getInvitationThemePreviewSampleUrl } from '${invitationThemesModuleUrl}';`,
        "console.log(getInvitationThemePreviewSampleUrl('emotional', 'standard'));",
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        npxCliPath,
        '--yes',
        'tsx',
        '--conditions',
        'react-server',
        scriptPath,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env,
      }
    );

    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function withPublicSiteUrl(value: string | undefined, assertion: () => void) {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;

  try {
    if (value === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = value;
    }

    assertion();
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  }
}

withPublicSiteUrl('https://preview.msgnote.kr/custom-path/', () => {
  assert.equal(getPublicSiteUrl().origin, 'https://preview.msgnote.kr');
  assert.equal(
    getFreshThemePreviewUrl(process.env.NEXT_PUBLIC_SITE_URL),
    'https://preview.msgnote.kr/kim-taehyun-choi-yuna/emotional/'
  );
});

withPublicSiteUrl(undefined, () => {
  assert.equal(getPublicSiteUrl().toString(), `${DEFAULT_PUBLIC_SITE_URL}/`);
  assert.equal(
    getFreshThemePreviewUrl(),
    'https://invite.msgnote.kr/kim-taehyun-choi-yuna/emotional/'
  );
});

console.log('admin event preview link checks passed');
