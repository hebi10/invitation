import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = (filename: string) => readFileSync(path.join(process.cwd(), filename), 'utf8');

const home = source('apps/mobile/src/app/(tabs)/index.tsx');
const hero = source('apps/mobile/src/components/WeddingIntroHero.tsx');
const login = source('apps/mobile/src/app/login.tsx');
const account = source('apps/mobile/src/components/AccountInvitationsSection.tsx');
const recent = source('apps/mobile/src/features/login/components/RecentLinkedInvitationsSection.tsx');
const drafts = source('apps/mobile/src/components/DraftInvitationsSection.tsx');
const gallery = source('apps/mobile/src/components/ThemePreviewGallery.tsx');
const create = source('apps/mobile/src/app/(tabs)/create.tsx');
const mypage = source('apps/mobile/src/app/(tabs)/guide.tsx');
const tabs = source('apps/mobile/src/app/(tabs)/_layout.tsx');
const themeMetadata = source('src/lib/invitationThemes.ts');

assert.ok(home.indexOf('<DraftInvitationsSection />') < home.indexOf('<WeddingIntroHero />'),
  'Existing drafts must remain accessible before the editorial home hero.');
assert.ok(home.indexOf('<WeddingIntroHero />') < home.indexOf('<ThemePreviewGallery />'),
  'New users should see the editorial introduction before live theme previews.');
assert.match(home, /기존 청첩장 연결/);
assert.match(home, /새 청첩장 만들기/);

assert.match(hero, /wedding-portrait\.webp/);
assert.match(hero, /wedding-bouquet\.webp/);
assert.match(home, /INVITATION_PREMIUM_PRICE_LABEL/);
assert.match(home, /INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS/);
assert.ok(home.indexOf('<WeddingIntroHero />') < home.indexOf('accessibilityLabel="프리미엄 청첩장 상품"'),
  'The home product summary must remain after the editorial hero.');
assert.match(home, /accessibilityLabel="프리미엄 청첩장 상품"/);
assert.match(home, /title="Invitation"/);
assert.ok(hero.indexOf('<View style={styles.previews}>') < hero.indexOf('<View style={styles.copy}>'));
assert.match(hero, /borderRadius:\s*0/);
assert.match(gallery, /themePreviewImages\[theme\.key\]/);
assert.match(gallery, /Math\.floor\(\(width - 76\) \/ 2\)/);
assert.match(gallery, /findGuideSamplePageUrl/);
assert.match(gallery, /샘플 보기를 누르면 신민제·김현지의 공개 샘플 청첩장이 열립니다/);
assert.match(home, /신민제·김현지 샘플 청첩장/);
const sampleCapture = source('scripts/capture-clean-wedding-previews.mjs');
assert.match(sampleCapture, /sampleSlug = 'shin-minje-kim-hyunji'/);
assert.match(sampleCapture, /text\.includes\('신민제'\) && text\.includes\('김현지'\)/);
assert.doesNotMatch(sampleCapture, /an-doyoung-yoon-jisoo/);

assert.match(login, /RecentLinkedInvitationsSection/);
assert.match(login, /최근 연동한 청첩장을 확인하고 있습니다/);
assert.match(login, /handleContinueLinkedInvitation/);
assert.match(recent, /canActivateLinkedInvitationCard/);
assert.match(recent, /onCopyLink\(card\)/);
assert.match(account, /loginCustomer\(email\.trim\(\), password\)/);
assert.match(account, /accessibilityRole="alert"/);

assert.match(create, /고객 계정 로그인 → Google Play 결제 → 청첩장 정보 입력/);
assert.match(create, /runPendingBillingPurchase\(request/);
assert.match(create, /recoverPendingBillingPurchase/);
assert.match(create, /buildPrivateInvitationDraft/);
assert.match(create, /purchaseBillingProduct\(productId/);
assert.match(create, /router\.replace\('\/guide'\)/);
assert.match(create, /title="청첩장 만들기"/);
assert.match(create, /accessibilityState=\{\{ selected \}\}/,
  'The compact progress steps must expose the current step to accessibility.');
assert.match(create, /creationCompleted/);
assert.match(create, /CreationCompletedView/);
assert.match(create, /로그인 후 결제 진행/);
assert.match(create, /이전 결제 이어서 처리/);
assert.match(create, /INVITATION_PREMIUM_PRICE_KRW/);
assert.match(create, /getPendingBillingRequest/);
assert.match(create, /listMobileCustomerInvitations\(apiBaseUrl, idToken\)/);
assert.match(drafts, /기존 초안의 입력값은 자동 이전되지 않습니다/);
assert.match(drafts, /새 방식으로 제작/);
assert.doesNotMatch(create, /ticketPurchase|티켓 구매/);
assert.match(mypage, /<AccountInvitationsSection/);
assert.match(mypage, /<ManageScreenContent/);
assert.match(account, /OwnedInvitationThemeShares/);
assert.match(account, /Share\.share/);
assert.match(tabs, /title: '마이페이지'/);
for (const theme of ['emotional', 'romantic', 'gyeol', 'simple', 'classic-r']) {
  assert.ok(themeMetadata.includes(`/shin-minje-kim-hyunji/${theme}/`));
}
console.log('mobile stage 2 design contract tests passed');
