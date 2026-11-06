import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = (filename: string) => readFileSync(path.join(process.cwd(), filename), 'utf8');

const home = source('apps/mobile/src/app/(tabs)/index.tsx');
const hero = source('apps/mobile/src/components/WeddingIntroHero.tsx');
const login = source('apps/mobile/src/app/login.tsx');
const account = source('apps/mobile/src/components/AccountInvitationsSection.tsx');
const recent = source('apps/mobile/src/features/login/components/RecentLinkedInvitationsSection.tsx');
const gallery = source('apps/mobile/src/components/ThemePreviewGallery.tsx');
const create = source('apps/mobile/src/app/(tabs)/create.tsx');
const createStyles = source('apps/mobile/src/features/create/createStyles.ts');

assert.ok(home.indexOf('<DraftInvitationsSection />') < home.indexOf('<WeddingIntroHero />'),
  'Existing drafts must remain accessible before the editorial home hero.');
assert.ok(home.indexOf('<WeddingIntroHero />') < home.indexOf('<AccountInvitationsSection />'),
  'New users should see the editorial introduction before the account form.');
assert.match(home, /기존 청첩장 연결/);
assert.match(home, /새 청첩장 만들기/);

assert.match(hero, /wedding-portrait\.webp/);
assert.match(hero, /wedding-bouquet\.webp/);
assert.match(hero, /INVITATION_PREMIUM_PRICE_LABEL/);
assert.match(hero, /INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS/);
assert.match(hero, /borderRadius:\s*0/);
assert.match(gallery, /themePreviewImages\[theme\.key\]/);
assert.match(gallery, /findGuideSamplePageUrl/);
assert.match(gallery, /샘플 보기 버튼을 누르면/);

assert.match(login, /RecentLinkedInvitationsSection/);
assert.match(login, /최근 연동한 청첩장을 확인하고 있습니다/);
assert.match(login, /handleContinueLinkedInvitation/);
assert.match(recent, /canActivateLinkedInvitationCard/);
assert.match(recent, /onCopyLink\(card\)/);
assert.match(account, /loginCustomer\(email\.trim\(\), password\)/);
assert.match(account, /accessibilityRole="alert"/);

assert.match(create, /CREATE_STEPS\.map\(\(step, index\)/);
assert.match(create, /createForm\.handleStepTabPress\(step\.key\)/);
assert.match(create, /styles\.paymentTotalRow/);
assert.match(create, /INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS/);
assert.match(create, /createForm\.handlePrimaryStepAction/);
assert.match(create, /createForm\.handleRecoverCreation\(\)/);
assert.doesNotMatch(create, /ticketPurchase|티켓 구매/);
assert.match(create, /isCompleted && !isSelected \? '완료'/);
assert.match(createStyles, /paymentTotalRow:\s*\{\s*borderWidth:\s*1/);
assert.match(createStyles, /stickyBarContent:\s*\{\s*width:\s*'100%',\s*maxWidth:\s*640/);
assert.doesNotMatch(createStyles, /stepTabsRow:\s*\{[^}]*flexWrap:\s*'wrap'/);
console.log('mobile stage 2 design contract tests passed');
