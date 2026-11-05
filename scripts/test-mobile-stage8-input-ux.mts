import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const workspace = read('apps/mobile/src/components/manage/InvitationEditorWorkspace.tsx');
const input = read('apps/mobile/src/components/TextField.tsx');
const modal = read('apps/mobile/src/components/AppModalFrame.tsx');
const payment = read('apps/mobile/src/features/create/components/PaymentConfirmModal.tsx');
const fixture = read('scripts/fixtures/mobile-keyboard-capture.tsx.fixture');
const capture = read('scripts/capture-mobile-android.py');
const workflow = read('.github/workflows/mobile-captures.yml');

assert.match(workspace, /useWindowDimensions/);
assert.match(workspace, /const compactLayout = width < 360 \|\| \(width < 390 && fontScale > 1\)/);
assert.match(workspace, /compactPublicationLabel/);
assert.match(workspace, /numberOfLines=\{statusTone === 'danger' \? 2 : 1\}/);
assert.match(workspace, /styles\.headerNarrow/);
assert.match(workspace, /styles\.scrollContentNarrow/);
assert.match(workspace, /styles\.footerNarrow/);
assert.match(workspace, /keyboardVisible \? compactFooter : footer/);
assert.match(workspace, /accessibilityRole="progressbar"/);
assert.match(workspace, /onSelectStep\(index\)/);

assert.match(input, /accessibilityHint=\{accessibilityHint \?\? helperText\}/);
assert.match(input, /minHeight: APP_CONTROL_MIN_HEIGHT/);

assert.match(modal, /useWindowDimensions/);
assert.match(modal, /const compactLayout = width < 360/);
assert.match(modal, /compactLayout \? styles\.cardNarrow : null/);
assert.match(modal, /keyboardShouldPersistTaps="handled"/);
assert.match(modal, /onRequestClose=\{dismiss\}/);
assert.match(payment, /결제 완료 후 청첩장이 생성됩니다/);
assert.match(payment, /onRecover/);
assert.match(payment, /hasPendingPurchase/);

assert.match(fixture, /Keyboard\.addListener\('keyboardDidShow'/);
assert.match(fixture, /Keyboard\.addListener\('keyboardDidHide'/);
assert.match(fixture, /<TextField/);
assert.match(fixture, /키보드 열기 대기/);
assert.match(fixture, /키보드 표시 중/);
assert.match(fixture, /compactFooter=/);
assert.match(fixture, /내용 저장/);

assert.match(capture, /shutil\.copyfile\(KEYBOARD_FIXTURE, KEYBOARD_ROUTE\)/);
assert.match(capture, /wait_screen\(\s*'editor-keyboard-ready', 'design-check-keyboard'/);
assert.match(capture, /keyboard_input = next\(/);
assert.match(capture, /tap\(keyboard_input\)/);
assert.match(capture, /\['청첩장 편집', '키보드 확인 입력', '저장 후 다음'\]/);
assert.match(capture, /wait_screen\(\s*'editor-keyboard', 'design-check-keyboard'/);
assert.match(capture, /timeout=45, launch=False/);
assert.match(capture, /VERIFIED\['keyboard_capture'\]/);
assert.match(capture, /\['keyboard_verified'\] = True/);
assert.match(capture, /KEYBOARD_ROUTE\.unlink\(missing_ok=True\)/);
assert.match(capture, /capture_responsive_views\(\)/);
assert.match(capture, /320, \[/);
assert.match(workflow, /scripts\/fixtures\/mobile-keyboard-capture\.tsx\.fixture/);

for (const path of [
  'apps/mobile/src/features/manage/components/steps/BasicEditorStep.tsx',
  'apps/mobile/src/features/manage/components/steps/SettingsEditorStep.tsx',
  'apps/mobile/src/features/create/components/TicketOnlyPurchaseModal.tsx',
]) {
  assert.ok(read(path).length > 0, path);
}
console.log('mobile stage 8 keyboard, compact editor and payment modal UX checks passed');
