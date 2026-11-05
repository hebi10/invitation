import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const guide = read('apps/mobile/src/app/(tabs)/guide.tsx');
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

assert.match(guide, /<SectionCard\s+title="프리미엄 청첩장"/);
assert.match(guide, /plan\.priceLabel/);
assert.match(guide, /INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS/);
assert.match(guide, /guideSections\.map/);
assert.match(guide, /<Disclosure/);
assert.match(guide, /<AccountHelpLinks/);
assert.match(guide, /\/privacy\/mobile-invitation\//);
assert.match(guide, /\/privacy\/mobile-invitation\/delete-request\//);
assert.match(guide, /mailto:sevim0104@naver\.com/);
assert.doesNotMatch(guide, /borderTopWidth|borderBottomWidth|elevation|boxShadow/);

assert.match(disclosure, /accessibilityState=\{\{ expanded \}\}/);
assert.match(disclosure, /expanded \|\| pressed/);
assert.match(disclosure, /borderWidth:\s*1/);
assert.match(disclosure, /minHeight:\s*56/);

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
assert.doesNotMatch(statusScreen, /borderTopWidth|borderBottomWidth|boxShadow|elevation/);

assert.match(feedback, /AppToastTone = 'success' \| 'error' \| 'notice' \| 'neutral'/);
assert.match(feedback, /AccessibilityInfo\.announceForAccessibility/);
assert.match(feedback, /toast\.tone === 'success'/);
assert.match(feedback, /toast\.tone === 'error'/);
assert.match(feedback, /toast\.tone === 'notice'/);
assert.match(feedback, /backgroundColor: palette\.noticeSoft/);
assert.match(feedback, /color=\{palette\.notice\}/);
assert.match(feedback, /maxWidth: 640/);
assert.doesNotMatch(feedback, /borderTopWidth|borderBottomWidth/);

assert.match(config, /icon: '\.\/assets\/icon-v3\.png'/);
assert.match(config, /foregroundImage: '\.\/assets\/icon-v3\.png'/);
assert.match(config, /image: '\.\/assets\/splash\.jpg'/);
for (const filename of ['apps/mobile/assets/icon-v3.png', 'apps/mobile/assets/splash.jpg']) {
  assert.ok(existsSync(filename) && statSync(filename).size > 0, filename);
}

for (const kind of ['dark', 'large', 'error', 'not-found', 'toast-error'] as const) {
  assert.ok(fixture.includes(`kind === '${kind}'`), `system fixture missing ${kind}`);
  const name = {
    dark: 'settings-dark',
    large: 'settings-large',
    error: 'system-error',
    'not-found': 'system-not-found',
    'toast-error': 'system-toast-error',
  }[kind];
  assert.ok(capture.includes(`'${name}'`), `Android capture missing ${name}`);
}
assert.match(capture, /shutil\.copyfile\(SYSTEM_FIXTURE, SYSTEM_ROUTE\)/);
assert.match(capture, /SYSTEM_ROUTE\.unlink\(missing_ok=True\)/);
console.log('Mobile stage 6 guide, settings, error and system state design checks passed');
