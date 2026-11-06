import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { EDITOR_STEPS } from '../apps/mobile/src/features/manage/shared.ts';
import { getFontScale, getPalette, resolveAppColorScheme } from '../apps/mobile/src/constants/theme.ts';
import { getInvitationVisibility } from '../apps/mobile/src/features/manage/invitationVisibility.ts';
import {
  isTrustedReleaseEvent,
  resolvePlayTarget,
  shouldDeployRelease,
} from './mobile-release-policy.mjs';

function read(path: string) {
  assert.ok(existsSync(path), `Missing release file: ${path}`);
  return readFileSync(path, 'utf8');
}

for (const name of [
  'test-mobile-ui-tokens',
  'test-mobile-stage2-design',
  'test-mobile-stage3-design',
  'test-mobile-stage4-editor-design',
  'test-mobile-stage5-modal-design',
  'test-mobile-stage6-system-design',
]) {
  assert.match(read('scripts/run-test-suite.mjs'), new RegExp(name));
}

const capture = read('scripts/capture-mobile-android.py');
const captures = [
  'my-invitations',
  'login',
  'create',
  'guide',
  'settings',
  'account-list-12',
  'linked-list',
  'editor-fixture',
  'editor-save-error',
  'editor-schedule',
  'editor-location',
  'editor-greeting',
  'editor-images',
  'editor-music',
  'editor-intro',
  'editor-intro-closed',
  'modal-payment',
  'modal-payment-pending',
  'modal-renew',
  'modal-renew-pending',
  'modal-renew-other',
  'modal-renew-loading',
  'modal-renew-no-account',
  'modal-preview',
  'modal-share',
  'modal-onboarding',
  'modal-onboarding-last',
  'modal-guestbook',
  'modal-guestbook-filled',
  'modal-risk',
  'modal-preparing',
  'settings-dark',
  'settings-large',
  'system-error',
  'system-not-found',
  'system-toast-error',
];
for (const name of captures) {
  assert.ok(capture.includes(`'${name}'`), `Missing Android capture: ${name}`);
}
for (const width of [320, 360, 390, 430]) {
  assert.ok(capture.includes(`(${width}, [`), `Responsive test missing ${width}dp`);
}
assert.match(capture, /def capture_responsive_views\(\):/);
assert.match(capture, /adb\('shell', 'wm', 'density', 'reset', check=False\)/);
assert.match(capture, /capture_responsive_views\(\)/);
assert.match(capture, /VERIFY|VERIFIED\['status'\] = 'passed'/);
assert.match(capture, /def capture_keyboard\(tree\):/);

const releaseWorkflow = read('.github/workflows/mobile-release.yml');
const captureWorkflow = read('.github/workflows/mobile-captures.yml');
const config = read('apps/mobile/app.config.ts');
const tabs = read('apps/mobile/src/app/(tabs)/_layout.tsx');

assert.match(releaseWorkflow, /branches: \[main, build\/mobile-aab\]/);
assert.match(releaseWorkflow, /needs\.bundle\.outputs\.deploy == 'true'/);
assert.match(releaseWorkflow, /scripts\/verify-mobile-release\.py/);
assert.match(captureWorkflow, /pull_request:/);
assert.match(captureWorkflow, /scripts\/capture-mobile-android\.py/);
assert.match(config, /package: 'kr\.msgnote\.mobileinvitation'/);
assert.match(config, /icon: '\.\/assets\/icon-v3\.png'/);
assert.match(config, /backgroundColor: '#faf8f5'/);
assert.match(config, /predictiveBackGestureEnabled: false/);
assert.match(config, /'android\.permission\.CAMERA'/);
assert.match(config, /'android\.permission\.RECORD_AUDIO'/);
assert.doesNotMatch(tabs, /borderTopWidth|borderBottomWidth|elevation:\\s*[1-9]/);
assert.match(tabs, /boxShadow: 'none'/);

assert.equal(isTrustedReleaseEvent({ eventName: 'pull_request', ref: 'refs/heads/main' }), false);
assert.equal(isTrustedReleaseEvent({ eventName: 'push', ref: 'refs/heads/main' }), true);
assert.equal(shouldDeployRelease({
  eventName: 'push', ref: 'refs/heads/main', autoDeployEnabled: 'true', manualDeploy: false,
}), true);
assert.equal(shouldDeployRelease({
  eventName: 'push', ref: 'refs/heads/feature', autoDeployEnabled: 'true', manualDeploy: false,
}), false);
assert.deepEqual(resolvePlayTarget({
  eventName: 'push', ref: 'refs/heads/main', target: 'closed',
}), { target: 'internal', track: 'internal' });

assert.deepEqual(EDITOR_STEPS.map((step) => step.key), [
  'basic', 'schedule', 'location', 'greeting', 'images', 'music', 'settings',
]);
assert.equal(getFontScale('large'), 1.12);
assert.equal(resolveAppColorScheme('dark', 'system'), 'dark');
assert.equal(getPalette('light').accent, '#292b27');
assert.equal(getPalette('dark').background, '#151815');

const activePeriod = {
  enabled: true,
  startDate: '2026-01-01T00:00:00+09:00',
  endDate: '2027-12-31T23:59:59+09:00',
};
assert.equal(getInvitationVisibility(true, activePeriod, Date.parse('2026-11-05')).label, '공개 중');
assert.equal(getInvitationVisibility(false, activePeriod, Date.parse('2026-11-05')).label, '비공개');

const manage = read('apps/mobile/src/features/screens/manage.tsx');
assert.match(manage, /onClose=\{\(\) => void handleCloseEditorModal\(\)\}/);
assert.match(manage, /onSetIntroStyle=\{invitationForm\.setIntroStyle\}/);
assert.match(manage, /onKakaoShare=\{handleOpenKakaoShare\}/);
assert.match(manage, /onPurchase=\{\(\) => void handlePurchaseExtension\(\)\}/);
assert.match(manage, /onRecover=\{\(\) => void handleRecoverExtension\(\)\}/);

console.log('mobile stage 7 integration, responsive and release safety checks passed');
