import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const guide = read('apps/mobile/src/app/(tabs)/guide.tsx');
const guideContent = read('apps/mobile/src/constants/content.ts');
const bulletList = read('apps/mobile/src/components/BulletList.tsx');
const settings = read('apps/mobile/src/features/screens/settings.tsx');
const disclosure = read('apps/mobile/src/components/Disclosure.tsx');
const error = read('apps/mobile/src/components/AppErrorBoundary.tsx');
const missingPage = read('apps/mobile/src/app/+not-found.tsx');
const statusScreen = read('apps/mobile/src/components/AppStatusScreen.tsx');
const feedback = read('apps/mobile/src/contexts/AppFeedbackContext.tsx');
const preferences = read('apps/mobile/src/contexts/PreferencesContext.tsx');
const config = read('apps/mobile/app.config.ts');
const fixture = read('scripts/fixtures/mobile-system-capture.tsx.fixture');
const capture = read('scripts/capture-mobile-android.py');

assert.match(guide, /title="마이페이지"/);
assert.match(guide, /<AccountInvitationsSection/);
assert.match(guide, /<ManageScreenContent/);
assert.match(guide, /router\.push\('\/create'\)/);
assert.match(settings, /guideSections\.map/);
assert.match(settings, /INVITATION_PREMIUM_PRICE_LABEL/);
assert.match(settings, /INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS/);
assert.match(settings, /styles\.settingSurface/);
assert.match(settings, /styles\.productSummary/);
assert.ok(settings.indexOf('title="이용 안내"') < settings.indexOf('title="앱 정보"'));
assert.match(guideContent, /만들기 탭에서 고객 계정으로 로그인합니다/);
assert.match(guideContent, /Google Play 결제가 확인되면 청첩장 주소와 비공개 초안이 생성됩니다/);
assert.doesNotMatch(guideContent, /만들기에서 로그인하고 두 사람의 이름과 청첩장 주소를 입력합니다/);
assert.match(bulletList, /getScaledTypography\('body', fontScale\)/);
assert.match(settings, /<Disclosure/);
assert.match(settings, /\/privacy\/mobile-invitation\//);
assert.match(settings, /\/privacy\/mobile-invitation\/delete-request\//);
assert.match(settings, /mailto:sevim0104@naver\.com/);
assert.doesNotMatch(guide, /borderTopWidth|borderBottomWidth|elevation|boxShadow/);

assert.match(disclosure, /accessibilityState=\{\{ expanded \}\}/);
assert.match(disclosure, /expanded \|\| pressed/);
assert.match(disclosure, /borderWidth:\s*1/);
assert.match(disclosure, /minHeight:\s*56/);
assert.match(disclosure, /accessibilityHint=/);

assert.match(settings, /setThemePreference\('system'\)/);
assert.match(settings, /setThemePreference\('light'\)/);
assert.match(settings, /setThemePreference\('dark'\)/);
assert.match(settings, /setFontScalePreference\('normal'\)/);
assert.match(settings, /setFontScalePreference\('large'\)/);
assert.match(settings, /다크 모드 사용 중/);
assert.match(settings, /큰 글자 크기 사용 중/);
assert.match(settings, /Constants\.expoConfig\?\.version/);
assert.match(settings, /Constants\.nativeBuildVersion/);
assert.match(settings, /UPDATE_GUIDE_ITEMS/);
assert.doesNotMatch(settings, /borderTopWidth|borderBottomWidth/);
assert.match(preferences, /PREFERENCES_STORAGE_KEY/);
assert.match(preferences, /setStoredJson\(PREFERENCES_STORAGE_KEY, next\)/);

assert.match(error, /static getDerivedStateFromError/);
assert.match(error, /this\.setState\(\{ hasError: false \}/);
assert.match(error, /router\.replace\('\/'\)/);
assert.match(error, /<AppStatusScreen/);
assert.match(missingPage, /<AppStatusScreen/);
assert.match(missingPage, /router\.replace\('\/'\)/);
assert.match(statusScreen, /getScaledTypography\('title', fontScale\)/);
assert.match(statusScreen, /getScaledTypography\('body', fontScale\)/);
assert.match(statusScreen, /getScaledTypography\('button', fontScale\)/);
assert.match(statusScreen, /accessibilityRole="button"/);
assert.match(statusScreen, /APP_CONTROL_MIN_HEIGHT/);
assert.match(statusScreen, /<ScrollView/);
assert.match(statusScreen, /flexGrow: 1/);
assert.match(statusScreen, /paddingBottom: insets\.bottom \+ APP_SPACING\.xl/);
assert.match(error, /\{ label: '다시 시도', onPress: onRetry, variant: 'primary' \}/);
assert.doesNotMatch(statusScreen, /borderTopWidth|borderBottomWidth|boxShadow|elevation/);

assert.match(feedback, /AppToastTone = 'success' \| 'error' \| 'notice' \| 'neutral'/);
assert.match(feedback, /AccessibilityInfo\.announceForAccessibility/);
assert.match(feedback, /toast\.tone === 'success'/);
assert.match(feedback, /toast\.tone === 'error'/);
assert.match(feedback, /toast\.tone === 'notice'/);
assert.match(feedback, /backgroundColor: palette\.noticeSoft/);
assert.match(feedback, /color=\{palette\.notice\}/);
assert.match(feedback, /maxWidth: 640/);
assert.match(feedback, /toastToneLabel/);
assert.match(feedback, /accessibilityLabel=\{\x60\$\{toastToneLabel\}/);
assert.match(feedback, /tone === 'error' \? 5000 : DEFAULT_TOAST_DURATION_MS/);
assert.doesNotMatch(feedback, /borderTopWidth|borderBottomWidth/);

assert.match(config, /icon: '\.\/assets\/icon-v3\.png'/);
assert.match(config, /foregroundImage: '\.\/assets\/adaptive-icon-v3\.png'/);
assert.match(config, /image: '\.\/assets\/splash\.jpg'/);
for (const filename of ['apps/mobile/assets/icon-v3.png', 'apps/mobile/assets/adaptive-icon-v3.png', 'apps/mobile/assets/splash.jpg']) {
  assert.ok(existsSync(filename) && statSync(filename).size > 0, filename);
}

for (const kind of ['dark', 'large', 'error', 'not-found', 'toast-error', 'toast-success', 'toast-notice', 'toast-neutral', 'loading'] as const) {
  assert.ok(fixture.includes(`kind === '${kind}'`), `system fixture missing ${kind}`);
  const name = {
    dark: 'settings-dark',
    large: 'settings-large',
    error: 'system-error',
    'not-found': 'system-not-found',
    'toast-error': 'system-toast-error',
    'toast-success': 'system-toast-success',
    'toast-notice': 'system-toast-notice',
    'toast-neutral': 'system-toast-neutral',
    loading: 'system-loading',
  }[kind];
  assert.ok(capture.includes(`'${name}'`), `Android capture missing ${name}`);
}
assert.match(capture, /shutil\.copyfile\(SYSTEM_FIXTURE, SYSTEM_ROUTE\)/);
assert.match(capture, /SYSTEM_ROUTE\.unlink\(missing_ok=True\)/);
console.log('Mobile stage 6 My Page, settings, privacy and system state checks passed');
