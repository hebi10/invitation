import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const root = 'apps/mobile/src/';
const frame = read(root + 'components/AppModalFrame.tsx');
const primitives = read(root + 'components/ModalPrimitives.tsx');
const payment = read(root + 'features/create/components/PaymentConfirmModal.tsx');
const renewal = read(root + 'features/manage/components/PeriodExtensionModal.tsx');
const previewShare = read(root + 'features/manage/components/InvitationThemeActionList.tsx');
const guestbook = read(root + 'features/manage/components/GuestbookModal.tsx');
const onboarding = read(root + 'features/manage/components/OnboardingModal.tsx');
const preparing = read(root + 'features/manage/components/EditorPreparingModal.tsx');
const risk = read(root + 'components/manage/HighRiskActionModal.tsx');
const editorShell = read(root + 'components/manage/InvitationEditorModalShell.tsx');
const manage = read(root + 'features/screens/manage.tsx');
const fixture = read('scripts/fixtures/mobile-modals-capture.tsx.fixture');
const capture = read('scripts/capture-mobile-android.py');

assert.match(frame, /closeDisabled\?: boolean/);
assert.match(frame, /contentDisabled\?: boolean/);
assert.match(frame, /footer\?: ReactNode/);
assert.match(frame, /onRequestClose=\{dismiss\}/);
assert.match(frame, /disabled=\{closeDisabled\}/);
assert.match(frame, /Platform.OS === 'ios' \? 'padding' : 'height'/);
assert.match(frame, /accessibilityViewIsModal/);

assert.match(primitives, /export function ModalSummaryRow/);
assert.match(primitives, /export function ModalFeedback/);
assert.match(primitives, /export function ModalActionStack/);
assert.match(primitives, /accessibilityLiveRegion=/);
assert.match(primitives, /borderWidth: 1/);
assert.match(primitives, /palette\.cardBorder/);

for (const [name, source] of [
  ['payment', payment],
]) {
  assert.match(source, /closeDisabled=\{loading\}/, name);
  assert.match(source, /loading=\{loading\}/, name);
  assert.match(source, /<ModalSummaryRow/, name);
  assert.match(source, /footer=\{\(/, name);
  assert.match(source, /variant="secondary" onPress=\{onClose\} disabled=\{loading\}/, name);
}
assert.match(payment, /getInvitationDisplayPeriodEnd\(new Date\(\)\)/);
assert.match(payment, /INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS/);
assert.match(payment, /formatPrice\(totalPrice\)/);
assert.match(payment, /hasPendingPurchase/);
assert.match(payment, /onRecover/);
assert.match(payment, /disabled=\{hasPendingPurchase\}/);
assert.match(payment, /onConfirm/);
assert.match(payment, /5,000원 결제하기/, 'Checkout CTA must remain legible at 320dp');
assert.doesNotMatch(payment, /Google Play 결제 후 페이지 생성/);

assert.match(renewal, /closeDisabled=\{busy\}/);
assert.match(renewal, /INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS/);
assert.match(renewal, /INVITATION_PREMIUM_PRICE_LABEL/);
assert.match(renewal, /onPurchase/);
assert.match(renewal, /onRecover/);
assert.match(renewal, /미처리 결제가 있습니다/);
assert.doesNotMatch(renewal, /onPress=\{onClose\}/, 'Modal shell already has a single close button');
assert.match(previewShare, /onSelect\(theme\)/);
assert.match(previewShare, /action === 'preview' \? '미리보기' : '카카오톡 공유'/);
assert.match(previewShare, /isCurrentTheme \? palette\.accentSoft : palette\.surface/);
assert.match(previewShare, /contentFit="contain"/);
assert.match(manage, /closeDisabled=\{isOpeningPreview\}/);
assert.match(manage, /closeDisabled=\{isOpeningKakaoShare\}/);
assert.match(manage, /confirmDiscard \? <View/);
assert.match(manage, /<ModalFeedback palette=\{palette\} tone="notice">/);
assert.match(manage, /handleCloseEditorModal\(true\)/);

assert.match(guestbook, /onHideComment\(comment\.id\)/);
assert.match(guestbook, /onScheduleDeleteComment\(comment\.id\)/);
assert.match(guestbook, /onRestoreComment\(comment\.id\)/);
assert.match(guestbook, /onChangePage\(Math\.max\(1, page - 1\)\)/);
assert.match(guestbook, /onChangePage\(Math\.min\(totalPages, page \+ 1\)\)/);
assert.match(guestbook, /status === 'pending_delete'/);
assert.match(guestbook, /palette\.successSoft/);
assert.match(guestbook, /검색 결과가 없습니다/);

assert.match(manage, /<PeriodExtensionModal/);
assert.match(manage, /onPurchase=\{\(\) => void handlePurchaseExtension\(\)\}/);
assert.doesNotMatch(manage, /TicketUsageModal/);

assert.match(onboarding, /ONBOARDING_STEPS\[stepIndex\]/);
assert.match(onboarding, /accessibilityRole="progressbar"/);
assert.match(onboarding, /footer=\{\(/);
assert.match(onboarding, /closeDisabled=\{isSaving\}/);
assert.match(onboarding, /onNext\(\)/);
assert.match(onboarding, /onSetPublished/);
assert.match(preparing, /<AppModalFrame/);
assert.match(preparing, /closeDisabled/);
assert.match(risk, /closeConfirmation=\{\(/);
assert.match(risk, /isDestructiveAction = \/삭제\|폐기\|초기화\//);
assert.match(risk, /variant=\{isDestructiveAction \? 'danger' : 'primary'\}/);
assert.match(risk, /placement="center"/);
assert.match(editorShell, /placement=\{placement\}/);
assert.match(previewShare, /사용 가능한 디자인이 없습니다/);
assert.match(risk, /onConfirm/);
assert.match(editorShell, /closeDisabled=\{closeDisabled \|\| closeLoading\}/);

for (const kind of [
  'payment', 'payment-pending', 'renew', 'renew-pending', 'renew-other',
  'renew-loading', 'renew-no-account', 'preview', 'share', 'guestbook', 'guestbook-filled',
  'onboarding', 'onboarding-last', 'risk', 'preparing',
]) {
  assert.ok(capture.includes(`'modal-${kind}'`),
    `Android screenshot capture should cover ${kind}`);
  assert.ok(fixture.includes(`kind === '${kind}'`) ||
    (kind === 'payment' && fixture.includes('return <PaymentConfirmModal')),
    `Fixture should support ${kind}`);
}
console.log('mobile stage 5 modal design, action safety and 15-capture contracts passed');
