import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const linksPath = '../src/lib/invitationShareLinks.ts';
const links = existsSync(new URL(linksPath, import.meta.url))
  ? await import(linksPath)
  : null;
assert.ok(links, '앱 카카오 공유는 미리보기 토큰이 없는 공개 주소를 구성해야 합니다.');
assert.equal(typeof links.buildInvitationSharePaths, 'function');

const { getWeddingPreviewThemeKeys } = await import('../src/lib/eventPreviewLinks.ts');
const themes = getWeddingPreviewThemeKeys();
const destinations = new Set<string>();
for (const theme of themes) {
  const urls = links.buildInvitationShareLinks('https://msgnote.kr/api?token=private#token=secret', 'couple-a', theme);
  assert.ok(urls);
  assert.deepEqual(links.buildInvitationSharePaths('couple-a', theme), {
    publicPath: `/couple-a/${theme}`,
    kakaoSharePath: `/mobile-share/couple-a/${theme}`,
  });
  assert.equal(urls.publicUrl, `https://msgnote.kr/couple-a/${theme}`);
  assert.equal(urls.kakaoShareUrl, `https://msgnote.kr/mobile-share/couple-a/${theme}`);
  assert.equal(new URL(urls.publicUrl).search, '');
  assert.equal(new URL(urls.publicUrl).hash, '');
  assert.ok(!urls.publicUrl.includes('mobile-preview'));
  assert.ok(!urls.publicUrl.includes('private'));
  destinations.add(urls.publicUrl);
}
assert.equal(destinations.size, 6, '같은 청첩장의 6개 디자인은 서로 다른 공개 링크를 가져야 합니다.');
for (const slug of ['', '../private', 'couple-a?token=private', 'couple-a#token=private', 'https://evil.test']) {
  assert.equal(links.buildInvitationShareLinks('https://msgnote.kr', slug, themes[0]), null);
  assert.equal(links.buildInvitationSharePaths(slug, themes[0]), null);
}
for (const origin of ['javascript:alert(1)', 'file:///tmp', 'https://user:password@evil.test']) {
  assert.equal(links.buildInvitationShareLinks(origin, 'couple-a', themes[0]), null);
}
assert.equal(links.buildInvitationShareLinks('https://msgnote.kr', 'couple-a', 'birthday-minimal'), null);
assert.equal(links.buildInvitationShareLinks('https://msgnote.kr', 'couple-a', 'not-a-theme'), null);

const modelPath = '../src/app/mobile-share/shareModel.ts';
const modelModule = existsSync(new URL(modelPath, import.meta.url)) ? await import(modelPath) : null;
assert.ok(modelModule, '공유 카드는 공개된 청첩장의 정보만 사용해야 합니다.');
const { buildMobileInvitationShareModel } = modelModule;
const page = {
  slug: 'couple-a', eventType: 'wedding', published: true,
  displayName: '김도윤 · 이서연', groomName: '김도윤', brideName: '이서연',
  date: '2027년 1월 9일', venue: '예식장', description: '소중한 분들을 초대합니다.',
  displayPeriodEnabled: true,
  displayPeriodStart: new Date('2026-11-01T00:00:00Z'),
  displayPeriodEnd: new Date('2027-05-01T00:00:00Z'),
  metadata: { title: '결혼합니다', description: '함께해 주세요', images: { kakaoCard: '/card.jpg', social: '/social.jpg', wedding: '/wedding.jpg' } },
  pageData: { galleryImages: ['/gallery.jpg'] },
};
const now = new Date('2026-11-04T00:00:00Z');
for (const theme of themes) {
  const result = buildMobileInvitationShareModel(page, theme, now);
  assert.ok(result);
  assert.equal(result.title, '결혼합니다');
  assert.equal(result.description, '함께해 주세요');
  assert.equal(result.imageUrl, '/card.jpg');
  assert.equal(result.fallbackImageUrl, '/social.jpg');
  assert.equal(result.publicPath, `/couple-a/${theme}`);
}
for (const blocked of [
  { ...page, published: false },
  { ...page, displayPeriodStart: new Date('2026-12-01T00:00:00Z') },
  { ...page, displayPeriodEnd: new Date('2026-10-31T00:00:00Z') },
  { ...page, displayPeriodEnd: null },
  { ...page, deletion: { status: 'running' } },
  { ...page, eventType: 'birthday' },
]) {
  assert.equal(buildMobileInvitationShareModel(blocked, themes[0], now), null);
}
for (const invalidImage of ['javascript:alert(1)', 'data:image/png;base64,abc', 'blob:https://msgnote.kr/id', 'ftp://images.test/card.jpg']) {
  const fallback = buildMobileInvitationShareModel({ ...page, metadata: { ...page.metadata, images: { kakaoCard: invalidImage, social: '/social.jpg' } } }, themes[0], now);
  assert.equal(fallback?.imageUrl, '/social.jpg');
}
const absoluteImageUrl = 'https://firebasestorage.googleapis.com/v0/b/invitation/o/card.jpg?alt=media';
for (const [source, expected] of [
  [absoluteImageUrl, absoluteImageUrl],
  ['//images.test/card.jpg', 'https://images.test/card.jpg'],
  ['images/card.jpg?size=large', '/images/card.jpg?size=large'],
]) {
  const result = buildMobileInvitationShareModel({ ...page, metadata: { ...page.metadata, images: { kakaoCard: source } } }, themes[0], now);
  assert.equal(result?.imageUrl, expected);
}
assert.equal(buildMobileInvitationShareModel(page, 'birthday-minimal', now), null);

const kakaoUtils = await import('../src/app/_components/kakaoShareUtils.ts');
assert.equal(typeof kakaoUtils.normalizeKakaoShareLinkUrl, 'function', '공유 URL은 공개 주소만 허용해야 합니다.');
assert.equal(kakaoUtils.normalizeKakaoShareLinkUrl('https://msgnote.kr/couple-a/simple', 'https://msgnote.kr'), 'https://msgnote.kr/couple-a/simple');
for (const target of [
  'javascript:alert(1)',
  'https://user:secret@msgnote.kr/couple-a/simple',
  'https://msgnote.kr/mobile-preview/couple-a/simple#token=secret',
  'https://msgnote.kr/mobile-share/couple-a/simple',
  'https://msgnote.kr/couple-a/simple?token=secret',
  'https://msgnote.kr/couple-a/simple#token=secret',
]) assert.equal(kakaoUtils.normalizeKakaoShareLinkUrl(target, 'https://msgnote.kr'), '');
const card = kakaoUtils.buildKakaoCardSharePayload('https://msgnote.kr/couple-a/simple', '결혼합니다', '함께해 주세요', 'https://msgnote.kr/card.jpg');
assert.equal(card.objectType, 'feed');
assert.equal(card.content.imageUrl, 'https://msgnote.kr/card.jpg');
assert.equal(card.content.link.mobileWebUrl, 'https://msgnote.kr/couple-a/simple');
assert.equal(card.buttons[0].link.webUrl, card.content.link.webUrl);

const routePath = 'src/app/mobile-share/[slug]/[theme]/page.tsx';
assert.ok(existsSync(routePath), '앱은 공개 정보만 사용하는 카카오 공유 화면을 열어야 합니다.');
const routeExports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
let routePage = { ...page, displayPeriodEnabled: false };
let lookupOptions: unknown;
let pageReads = 0;
const routeSource = ts.transpileModule(readFileSync(routePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
runInNewContext(routeSource, { exports: routeExports, Date, Promise,
  require(name: string) {
    if (name === 'next/navigation') return { notFound: () => { throw new Error('NOT_FOUND'); } };
    if (name === 'react/jsx-runtime') return { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) };
    if (name.includes('invitationPageServerService')) return { getServerInvitationPageBySlug: async (_slug: string, options: unknown) => { lookupOptions = options; pageReads++; return routePage; } };
    if (name.includes('invitationMetadata')) return { PUBLIC_SITE_ORIGIN: 'https://invite.msgnote.kr' };
    if (name.includes('eventPreviewLinks')) return { isWeddingPreviewThemeKey: (theme: string) => themes.includes(theme) };
    if (name.includes('invitationThemes')) return { getInvitationThemeLabel: () => '기본형' };
    if (name.endsWith('shareModel')) return modelModule;
    return { default: 'component' };
  },
});
const renderShareRoute = (theme = themes[0]) => routeExports.default({ params: Promise.resolve({ slug: page.slug, theme }) });
const routeTree = await renderShareRoute() as { props: { children: Array<{ props: Record<string, unknown> }> } };
const routeChildren = routeTree.props.children;
const routeShareButton = routeChildren.find(child => child?.props?.shareMode === 'card');
const routePublicLink = routeChildren.find(child => child?.props?.href);
const routeCardSection = routeChildren.find(child => child?.props?.['aria-label'] === '공유 카드 내용');
const routeImage = (routeCardSection?.props.children as Array<{ props?: Record<string, unknown> }>).find(child => child?.props?.src);
assert.ok(routeShareButton);
assert.ok(routePublicLink);
assert.ok(routeImage);
assert.equal(routeShareButton.props.shareUrl, `/couple-a/${themes[0]}`, '카카오 카드는 웹 공개 설정과 다른 현재 앱 서버의 공개 경로를 공유해야 합니다.');
assert.equal(routePublicLink.props.href, routeShareButton.props.shareUrl, '하객 확인 링크와 카드 링크는 같은 상대 경로를 사용해야 합니다.');
assert.equal(routeImage.props?.src, '/card.jpg', '대표 사진도 다른 공개 서버의 주소로 바꾸면 안 됩니다.');
for (const currentOrigin of ['https://msgnote.kr', 'http://localhost:3001']) {
  const publicPath = routeShareButton.props.shareUrl as string;
  assert.equal(kakaoUtils.normalizeKakaoShareLinkUrl(publicPath, currentOrigin), `${currentOrigin}${publicPath}`);
  assert.equal(new URL(routePublicLink.props.href as string, currentOrigin).origin, currentOrigin);
  assert.deepEqual(kakaoUtils.buildKakaoShareImageCandidates([
    routeShareButton.props.imageUrl,
    routeShareButton.props.fallbackImageUrl,
  ], currentOrigin), [`${currentOrigin}/card.jpg`, `${currentOrigin}/social.jpg`]);
}
assert.equal(JSON.stringify(lookupOptions), JSON.stringify({ includePrivate: false, sampleFallbackMode: 'never' }));
routePage = { ...routePage, published: false };
await assert.rejects(renderShareRoute(), /NOT_FOUND/);
routePage = { ...routePage, published: true, displayPeriodEnabled: true, displayPeriodEnd: new Date(0) };
await assert.rejects(renderShareRoute(), /NOT_FOUND/);
const previousReads = pageReads;
await assert.rejects(renderShareRoute('birthday-minimal'), /NOT_FOUND/);
assert.equal(pageReads, previousReads, '잘못된 디자인 요청에서는 청첩장 정보를 읽지 않아야 합니다.');

const mobileSharePath = '../apps/mobile/src/lib/invitationSharing.ts';
const mobileShare = existsSync(new URL(mobileSharePath, import.meta.url)) ? await import(mobileSharePath) : null;
assert.ok(mobileShare, '앱 공유 진입에서도 실제 공개 기간을 확인해야 합니다.');
const nativeCard = {
  slug: 'couple-a', published: true,
  displayPeriod: { enabled: true, startDate: page.displayPeriodStart.toISOString(), endDate: page.displayPeriodEnd.toISOString() },
  session: { token: 'secret-editor-token' },
};
for (const theme of themes) {
  const target = mobileShare.buildMobileKakaoShareTarget('https://msgnote.kr', nativeCard, theme, now.getTime());
  assert.equal(target.url, `https://msgnote.kr/mobile-share/couple-a/${theme}`);
  assert.ok(!JSON.stringify(target).includes('secret-editor-token'));
}
for (const blocked of [
  { ...nativeCard, published: false },
  { ...nativeCard, displayPeriod: { ...nativeCard.displayPeriod, startDate: '2999-01-01' } },
  { ...nativeCard, displayPeriod: { ...nativeCard.displayPeriod, endDate: '2000-01-01' } },
]) {
  const result = mobileShare.buildMobileKakaoShareTarget('https://msgnote.kr', blocked, themes[0], now.getTime());
  assert.equal(result.url, null);
  assert.ok(result.notice);
}
console.log('mobile Kakao share links, card content and public access checks passed');
