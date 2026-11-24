import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildConfigFromForm } from '../apps/mobile/src/features/manage/buildConfigFromForm';
import { getWeddingDateTimeInputError } from '../apps/mobile/src/features/manage/editorWeddingDateTime';
import { buildManageFormFromDashboard, EDITOR_STEPS, getOnboardingValidationMessage } from '../apps/mobile/src/features/manage/shared';
import type { MobileInvitationDashboard } from '../apps/mobile/src/types/mobileInvitation';
import { WEDDING_INTRO_OPTIONS } from '../apps/mobile/src/lib/weddingIntro';
import { buildPublicInvitationDateFeature } from '../src/app/_components/public-invitations/shared/dateFeatureModel';
import { getCustomerEventPresentation } from '../src/lib/customerEventPresentation';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence';
import { resolveCeremonyScheduleDetail, resolveInvitationPageDataByTheme } from '../src/lib/invitationThemePageData';
import { buildWeddingCalendar, toKoreanWeddingInstant } from '../src/lib/weddingCalendar';

const read = (path: string) => readFileSync(path, 'utf8');
const pathPrefix = 'apps/mobile/src/features/manage/components/steps/';
const editor = read('apps/mobile/src/components/manage/InvitationEditorWorkspace.tsx');
const styles = read('apps/mobile/src/features/manage/manageStyles.ts');
const basic = read(pathPrefix + 'BasicEditorStep.tsx');
const schedule = read(pathPrefix + 'ScheduleEditorStep.tsx');
const dateTimeFields = read('apps/mobile/src/features/manage/components/WeddingDateTimeFields.tsx');
const onboarding = read('apps/mobile/src/features/manage/components/OnboardingStepContent.tsx');
const location = read(pathPrefix + 'LocationEditorStep.tsx');
const greeting = read(pathPrefix + 'GreetingEditorStep.tsx');
const images = read(pathPrefix + 'ImagesEditorStep.tsx');
const music = read(pathPrefix + 'MusicEditorStep.tsx');
const settings = read(pathPrefix + 'SettingsEditorStep.tsx');
const rows = read('apps/mobile/src/features/manage/components/DelimitedRowsEditor.tsx');
const fixture = read('scripts/fixtures/mobile-editor-capture.tsx.fixture');
const capture = read('scripts/capture-mobile-android.py');
const manage = read('apps/mobile/src/features/screens/manage.tsx');

assert.deepEqual(EDITOR_STEPS.map((step) => step.key), [
  'basic', 'schedule', 'location', 'greeting', 'images', 'music', 'settings',
]);
assert.equal(WEDDING_INTRO_OPTIONS.length, 4, 'All existing PC intro options must remain selectable');

const emptyDateTime = { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
const dashboard = {
  page: {
    config: {
      slug: 'wedding-test', displayName: '청첩장', date: '', venue: '웨딩홀',
      weddingDateTime: emptyDateTime,
      couple: { groom: { name: '김도윤' }, bride: { name: '이서연' } },
      metadata: { images: { favicon: '/favicon.ico' } },
      variants: { simple: { available: true, path: '/wedding-test/simple', displayName: '기본 청첩장' } },
    },
    defaultTheme: 'simple', published: false, features: { maxGalleryImages: 18 },
  },
} as unknown as MobileInvitationDashboard;
const newForm = buildManageFormFromDashboard(dashboard);
const saved = buildConfigFromForm({
  dashboard,
  form: { ...newForm, weddingDateInput: '20280229', weddingTimeInput: '1430' },
});
assert.deepEqual(saved.weddingDateTime, { year: 2028, month: 1, day: 29, hour: 14, minute: 30 });
assert.equal(saved.date, '2028년 2월 29일 화요일');
assert.equal(saved.pageData?.ceremonyTime, '오후 2:30');
assert.equal(saved.pageData?.ceremony?.time, '오후 2:30');
const normalized = mergeInvitationPageSeed(undefined, saved as unknown as Record<string, unknown>);
assert.ok(normalized);
assert.equal(getCustomerEventPresentation(normalized).eventDateLabel, '2028. 2. 29. · 오후 2:30');
const simplePageData = resolveInvitationPageDataByTheme(normalized.pageData, 'simple');
assert.equal(resolveCeremonyScheduleDetail(simplePageData, normalized.venue)?.time, '오후 2:30');
const calendarInstant = toKoreanWeddingInstant(normalized.weddingDateTime);
assert.match(buildWeddingCalendar({
  eventDate: calendarInstant, title: '결혼식', location: '웨딩홀',
}) ?? '', /DTSTART:20280229T053000Z/);
const { year, month, day, hour, minute } = normalized.weddingDateTime;
const calendarModel = buildPublicInvitationDateFeature(
  { productTier: 'premium' },
  new Date(year, month, day, hour, minute),
  { mode: 'calendar-countdown', now: new Date('2028-02-28T05:30:00Z'), eventInstant: calendarInstant },
);
assert.equal(calendarModel?.eventDay, 29);
assert.equal(calendarModel?.dateTime, '2028-02-29T05:30:00.000Z');
assert.equal(calendarModel?.remainingDays, 1);

function asStored(config: typeof dashboard.page.config) {
  return { ...dashboard, page: { ...dashboard.page, config } };
}
const savedDashboard = asStored(saved);
const reopenedForm = buildManageFormFromDashboard(savedDashboard);
assert.equal(reopenedForm.weddingDateInput, '20280229');
assert.equal(reopenedForm.weddingTimeInput, '1430');
const clearedForm = { ...reopenedForm, weddingDateInput: '', weddingTimeInput: '' };
assert.ok(getWeddingDateTimeInputError(clearedForm, true));
assert.deepEqual(buildConfigFromForm({ dashboard: savedDashboard, form: clearedForm }).weddingDateTime, saved.weddingDateTime);
const rescheduled = buildConfigFromForm({
  dashboard: savedDashboard,
  form: { ...reopenedForm, weddingDateInput: '20290506', weddingTimeInput: '0930' },
});
assert.deepEqual(rescheduled.weddingDateTime, { year: 2029, month: 4, day: 6, hour: 9, minute: 30 });
assert.equal(rescheduled.pageData?.ceremonyTime, '오전 9:30');

for (const [dateInput, timeInput] of [['20270229', '1430'], ['20280431', '1430'], ['20280506', '2400'], ['20280506', '1460'], ['20280506', '']]) {
  const invalidForm = { ...newForm, weddingDateInput: dateInput, weddingTimeInput: timeInput, ceremonyAddress: '서울' };
  assert.ok(getWeddingDateTimeInputError(invalidForm), 'Invalid or incomplete dates must block regular editor saves');
  assert.ok(getOnboardingValidationMessage(1, invalidForm), 'Invalid dates must also block onboarding');
}
assert.equal(getWeddingDateTimeInputError(newForm), null, 'An empty draft may still save other fields');
assert.ok(getOnboardingValidationMessage(1, newForm), 'Onboarding still requires an event date');

const oldMobileDashboard = asStored({
  ...dashboard.page.config, date: '2027.05.06 오후 2시 30분',
  pageData: { ceremonyTime: '오후 2:30', ceremony: { time: '오후 2:30', location: '3층' } },
});
const oldMobileForm = buildManageFormFromDashboard(oldMobileDashboard);
assert.equal(oldMobileForm.weddingDateInput, '20270506');
assert.equal(oldMobileForm.weddingTimeInput, '1430');
const repaired = buildConfigFromForm({ dashboard: oldMobileDashboard, form: oldMobileForm });
assert.deepEqual(repaired.weddingDateTime, { year: 2027, month: 4, day: 6, hour: 14, minute: 30 });
assert.equal(repaired.pageData?.ceremony?.location, '3층');

const unknownLegacyDashboard = asStored({
  ...dashboard.page.config, date: '봄날의 예식',
  pageData: { ceremonyTime: '입장 시간 별도 안내', ceremony: { time: '현장 안내' } },
});
const unknownLegacyForm = buildManageFormFromDashboard(unknownLegacyDashboard);
const preserved = buildConfigFromForm({ dashboard: unknownLegacyDashboard, form: { ...unknownLegacyForm, venue: '새 장소' } });
assert.equal(preserved.date, '봄날의 예식');
assert.equal(preserved.pageData?.ceremonyTime, '입장 시간 별도 안내');
assert.equal(preserved.pageData?.ceremony?.time, '현장 안내');

const existingCustomDashboard = asStored({
  ...saved, date: '두 사람이 만나는 날',
  pageData: { ...saved.pageData, themeOverrides: { simple: { ceremony: { time: '오후 2시 반', location: '3층' } } } },
});
const existingCustomForm = buildManageFormFromDashboard(existingCustomDashboard);
const untouched = buildConfigFromForm({ dashboard: existingCustomDashboard, form: { ...existingCustomForm, venue: '새 장소' } });
assert.equal(untouched.date, '두 사람이 만나는 날');
assert.equal(untouched.pageData?.themeOverrides?.simple?.ceremony?.time, '오후 2시 반');
const updated = buildConfigFromForm({ dashboard: existingCustomDashboard, form: { ...existingCustomForm, weddingTimeInput: '1500' } });
assert.equal(updated.pageData?.themeOverrides?.simple?.ceremony?.time, '오후 3:00');
assert.equal(updated.pageData?.themeOverrides?.simple?.ceremony?.location, '3층');

const staleCalendarDashboard = asStored({
  ...saved, date: '2029년 5월 6일 일요일',
  pageData: { ceremonyTime: '오전 9:30', ceremony: { time: '오전 9:30' } },
});
const staleCalendarForm = buildManageFormFromDashboard(staleCalendarDashboard);
assert.equal(staleCalendarForm.weddingDateInput, '', 'A conflict must let the owner explicitly choose the intended date');
assert.equal(staleCalendarForm.weddingTimeInput, '');
assert.match(staleCalendarForm.legacyWeddingDateTimeLabel, /표지 2029년 5월 6일 일요일.*달력 2028년 2월 29일/);
const unrelatedSave = buildConfigFromForm({ dashboard: staleCalendarDashboard, form: { ...staleCalendarForm, venue: '새 예식장' } });
assert.equal(unrelatedSave.date, '2029년 5월 6일 일요일');
assert.deepEqual(unrelatedSave.weddingDateTime, saved.weddingDateTime);
const ownerCorrection = buildConfigFromForm({
  dashboard: staleCalendarDashboard,
  form: { ...staleCalendarForm, weddingDateInput: '20280229', weddingTimeInput: '1430' },
});
assert.equal(ownerCorrection.date, '2028년 2월 29일 화요일');
assert.equal(ownerCorrection.pageData?.ceremony?.time, '오후 2:30');

assert.match(editor, /accessibilityRole="progressbar"/);
assert.match(editor, /accessibilityValue=\{\{ min: 1, max: steps.length, now: activeStepIndex \+ 1 \}\}/);
assert.match(editor, /accessibilityLiveRegion="polite"/);
assert.match(editor, /styles.statusFlag/);
assert.match(editor, /onRequestClose=\{onClose\}/);
assert.match(editor, /confirmation \?\? \(keyboardVisible \? compactFooter : compactLayout/);
assert.match(editor, /compactNavigationFooter \?\? footer/);
assert.match(editor, /pointerEvents=\{busy \? 'none' : 'auto'\}/);
assert.match(editor, /onSaveCurrent/);
assert.match(editor, /다른 단계로 이동해도 입력값은 남지만 자동 저장되지 않습니다/);
assert.match(editor, /statusTone === 'danger'/);

assert.match(basic, /onUpdatePersonField/);
assert.match(basic, /onUpdateParentField/);
assert.match(basic, /label="신랑 이름 \(필수\)"/);
assert.match(basic, /label="신부 이름 \(필수\)"/);
assert.match(basic, /title="연락처·가족 정보 \(선택\)"/);
assert.match(schedule, /<WeddingDateTimeFields/);
assert.match(onboarding, /<WeddingDateTimeFields/);
assert.match(dateTimeFields, /label="예식 날짜"[\s\S]*keyboardType="number-pad"/);
assert.match(dateTimeFields, /label="예식 시간"[\s\S]*keyboardType="number-pad"/);
assert.match(schedule, /피로연 안내/);
for (const field of ['venue', 'ceremonyLocation', 'receptionTime', 'receptionLocation']) {
  assert.ok(schedule.includes(`onUpdateField('${field}', value)`), `Schedule must preserve ${field}`);
}
assert.match(location, /onSearchAddress\(\)/);
assert.match(location, /hasValidCoordinates\(mapLatitude, mapLongitude\)/);
assert.match(location, /onOpenMapUrl\(\)/);
assert.match(location, /title="지도 연결 확인"/);
assert.match(location, /입력한 주소로 위치 검색/);
assert.match(greeting, /DelimitedRowsEditor label="신랑측 계좌"/);
assert.match(greeting, /DelimitedRowsEditor label="신부측 계좌"/);
assert.match(greeting, /DelimitedRowsEditor label="교통 안내"/);
assert.match(greeting, /DelimitedRowsEditor label="화환 안내"/);
assert.match(rows, /updateEditorCell\(value, row, column, next, fields.length\)/);
assert.match(rows, /removeEditorRow\(value, row\)/);
assert.match(rows, /appendEditorRow\(value, fields.length\)/);
assert.match(greeting, /title="축의금·계좌 정보 \(선택\)"/);
assert.match(greeting, /title="교통·화환 안내 \(선택\)"/);
assert.match(rows, /이 항목 삭제/);

assert.match(images, /assetKind === 'cover' \? manageStyles.coverPreviewFrame : manageStyles.sharePreviewFrame/);
assert.match(images, /onMoveGalleryImage\(index, 'up'\)/);
assert.match(images, /onMoveGalleryImage\(index, 'down'\)/);
assert.match(images, /onRemoveSingleImage\(assetKind\)/);
assert.match(images, /variant=\{previewUrl \? 'danger' : 'secondary'\}/);
assert.match(images, /onRemoveGalleryImage\(index\)/);
assert.match(styles, /coverPreviewFrame:\s*\{[^}]*aspectRatio:\s*4 \/ 5/);
assert.match(styles, /sharePreviewFrame:\s*\{[^}]*aspectRatio:\s*1200 \/ 630/);
assert.match(styles, /galleryPreviewFrame:\s*\{[^}]*aspectRatio:\s*4 \/ 5/);
assert.match(images, /fit="contain"/);
assert.match(images, /title="공유용 이미지 \(선택\)"/);
assert.match(images, /사진 교체/);
assert.match(styles, /galleryCardBody/);

assert.match(music, /onSetMusicEnabled\(!form.musicEnabled\)/);
assert.match(music, /accessibilityState=\{\{ selected: form.musicEnabled \}\}/);
assert.match(music, /onSelectMusicCategory\(category.id\)/);
assert.match(music, /onSelectMusicTrack\(track.id\)/);
assert.match(music, /onUpdateField\('musicVolume', value\)/);
assert.match(music, /선택됨/);
assert.match(music, /form.musicEnabled \? \(/);
assert.match(music, /음악이 꺼져 있습니다/);
assert.match(music, /음악 음량 \(0~1\)/);
assert.match(settings, /WEDDING_INTRO_OPTIONS.map/);
assert.match(settings, /onSetIntroStyle\(option.value\)/);
assert.match(settings, /onPreviewIntro\(option.value\)/);
assert.match(settings, /savedPublished \? '공개' : '비공개'/);
assert.match(settings, /저장 예정:/);
assert.match(settings, /onSetPublished\(true\)/);
assert.match(settings, /onSetPublished\(false\)/);
assert.match(settings, /title="첫 화면 애니메이션 \(선택\)"/);
assert.match(settings, /공개 선택/);
assert.match(settings, /비공개 선택/);
assert.match(manage, /onClose=\{\(\) => void handleCloseEditorModal\(\)\}/);
assert.match(manage, /isFormDirty/);
assert.match(manage, /handleSaveEditor/);
assert.match(manage, /onSaveCurrent=\{\(\) => void handleSaveEditor/);
assert.ok(manage.indexOf('{notice ? <AppText accessibilityRole="alert"') <
  manage.indexOf('<ManageEditorStepContent'), 'Save failures should be visible above form fields');
assert.match(capture, /'editor-intro-closed'/);
assert.match(capture, /'editor-save-error'/);

assert.match(fixture, /resolveCaptureStepIndex/);
assert.match(fixture, /EDITOR_STEPS.findIndex/);
for (const step of ['schedule', 'location', 'greeting', 'images', 'music']) {
  assert.ok(capture.includes(`'editor-${step}'`), `Android screenshot must cover ${step}`);
}
assert.match(capture, /editor-fixture/);
assert.match(capture, /editor-intro/);
assert.match(capture, /'editor-location', 'location', \['청첩장 편집', '예식장 주소', '입력한 주소로 위치 검색'\]/);
console.log('Mobile stage 4 editor design and 7-step capture contracts passed');
