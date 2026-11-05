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
assert.equal(WEDDING_INTRO_OPTIONS.length, 4, 'All existing PC intro options must remain selectable');

assert.match(editor, /accessibilityRole="progressbar"/);
assert.match(editor, /accessibilityValue=\{\{ min: 1, max: steps.length, now: activeStepIndex \+ 1 \}\}/);
assert.match(editor, /accessibilityLiveRegion="polite"/);
assert.match(editor, /styles.statusFlag/);
assert.match(editor, /onRequestClose=\{onClose\}/);
assert.match(editor, /confirmation \?\? \(keyboardVisible \? compactFooter : footer\)/);
assert.match(editor, /pointerEvents=\{busy \? 'none' : 'auto'\}/);

assert.match(basic, /onUpdatePersonField/);
assert.match(basic, /onUpdateParentField/);
assert.match(schedule, /피로연 안내/);
for (const field of ['date', 'venue', 'ceremonyTime', 'ceremonyLocation', 'receptionTime', 'receptionLocation']) {
  assert.ok(schedule.includes(`onUpdateField('${field}', value)`), `Schedule must preserve ${field}`);
}
assert.match(location, /onSearchAddress\(\)/);
assert.match(location, /hasValidCoordinates\(mapLatitude, mapLongitude\)/);
assert.match(location, /onOpenMapUrl\(\)/);
assert.match(greeting, /DelimitedRowsEditor label="신랑측 계좌"/);
assert.match(greeting, /DelimitedRowsEditor label="신부측 계좌"/);
assert.match(greeting, /DelimitedRowsEditor label="교통 안내"/);
assert.match(greeting, /DelimitedRowsEditor label="화환 안내"/);
assert.match(rows, /updateEditorCell\(value, row, column, next, fields.length\)/);
assert.match(rows, /removeEditorRow\(value, row\)/);
assert.match(rows, /appendEditorRow\(value, fields.length\)/);

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

assert.match(music, /onSetMusicEnabled\(!form.musicEnabled\)/);
assert.match(music, /accessibilityState=\{\{ selected: form.musicEnabled \}\}/);
assert.match(music, /onSelectMusicCategory\(category.id\)/);
assert.match(music, /onSelectMusicTrack\(track.id\)/);
assert.match(music, /onUpdateField\('musicVolume', value\)/);
assert.match(music, /선택됨/);
assert.match(settings, /WEDDING_INTRO_OPTIONS.map/);
assert.match(settings, /onSetIntroStyle\(option.value\)/);
assert.match(settings, /onPreviewIntro\(option.value\)/);
assert.match(settings, /savedPublished \? '공개' : '비공개'/);
assert.match(settings, /저장 예정:/);
assert.match(settings, /onSetPublished\(true\)/);
assert.match(settings, /onSetPublished\(false\)/);
assert.match(manage, /onClose=\{\(\) => void handleCloseEditorModal\(\)\}/);
assert.match(manage, /isFormDirty/);
assert.match(manage, /handleSaveEditor/);

assert.match(fixture, /resolveCaptureStepIndex/);
assert.match(fixture, /EDITOR_STEPS.findIndex/);
for (const step of ['schedule', 'location', 'greeting', 'images', 'music']) {
  assert.ok(capture.includes(`'editor-${step}'`), `Android screenshot must cover ${step}`);
}
assert.match(capture, /editor-fixture/);
assert.match(capture, /editor-intro/);
console.log('Mobile stage 4 editor design and 7-step capture contracts passed');
