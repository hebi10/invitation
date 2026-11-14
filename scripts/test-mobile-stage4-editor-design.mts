import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { EDITOR_STEPS } from '../apps/mobile/src/features/manage/shared';
import { WEDDING_INTRO_OPTIONS } from '../apps/mobile/src/lib/weddingIntro';

const read = (path: string) => readFileSync(path, 'utf8');
const pathPrefix = 'apps/mobile/src/features/manage/components/steps/';
const editor = read('apps/mobile/src/components/manage/InvitationEditorWorkspace.tsx');
const styles = read('apps/mobile/src/features/manage/manageStyles.ts');
const basic = read(pathPrefix + 'BasicEditorStep.tsx');
const schedule = read(pathPrefix + 'ScheduleEditorStep.tsx');
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
assert.equal(WEDDING_INTRO_OPTIONS.length, 4, 'Existing intro values must remain supported for saved customers');

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
assert.match(schedule, /helperText="날짜와 시간을 한 문장으로 입력해 주세요/);
assert.match(schedule, /피로연 안내/);
for (const field of ['date', 'venue', 'ceremonyTime', 'ceremonyLocation', 'receptionTime', 'receptionLocation']) {
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
assert.match(settings, /listAvailableInvitationIntroPresets\(eventType\)/,
  'Android GIF options must respect the saved event type');
assert.match(settings, /visiblePresets\.map\(\(preset\)/,
  'Android must display filtered GIF presets');
assert.doesNotMatch(settings, /WEDDING_INTRO_OPTIONS\.map/,
  'Legacy animations must not appear as duplicate GIF choices');
assert.match(settings, /WEDDING_INTRO_OPTIONS\.find/,
  'Legacy saved intro label must remain readable');
assert.match(settings, /onSetIntroPresetId\(preset\.id\)/);
assert.match(settings, /onPreviewIntroPreset\(preset\.id\)/);
assert.match(settings, /savedPublished \? '공개' : '비공개'/);
assert.match(settings, /저장 예정:/);
assert.match(settings, /onSetPublished\(true\)/);
assert.match(settings, /onSetPublished\(false\)/);
assert.match(settings, /title="인트로 GIF \(선택\)"/);
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
assert.match(fixture, /onSetIntroPresetId=/);
assert.match(fixture, /eventType="wedding"/);
assert.match(capture, /'인트로 GIF \\(선택\\)'/);
assert.match(fixture, /EDITOR_STEPS.findIndex/);
for (const step of ['schedule', 'location', 'greeting', 'images', 'music']) {
  assert.ok(capture.includes(`'editor-${step}'`), `Android screenshot must cover ${step}`);
}
assert.match(capture, /editor-fixture/);
assert.match(capture, /editor-intro/);
assert.match(capture, /'editor-location', 'location', \['청첩장 편집', '예식장 주소', '입력한 주소로 위치 검색'\]/);
console.log('Mobile stage 4 editor design and 7-step capture contracts passed');
