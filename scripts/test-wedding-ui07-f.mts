import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const route = read('src/app/sample-invitation/page.tsx');
const sample = read('src/app/sample-invitation/SampleInvitation.tsx');
const base = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const music = read('src/components/media/BackgroundMusic.tsx');
const map = read('src/app/_components/public-invitations/wedding/gyeol/LocationMap.tsx');
const intro = read('src/components/sections/WeddingIntro/WeddingIntro.tsx');
const gallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const guestbook = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const browser = read('scripts/qa-invitation-ui07-f-browser.py');
const android = read('scripts/qa-invitation-ui07-f-android.py');
const workflow = read('.github/workflows/invitation-ui07-f-qa.yml');

const includesAll = (source: string, names: string[], context: string) => {
  for (const name of names) {
    assert.ok(source.includes(name), context + ': missing ' + name);
  }
};

includesAll(route, [
  "process.env.NODE_ENV !== 'production' && query.qaUI07 === '1'",
  "const qaUI07Intro = qaUI07 &&",
  "query.qaUI07Intro === 'light'",
  "query.qaUI07Intro === 'cinema'",
  "query.qaUI07Intro === 'envelope'",
  'qaUI07Intro={qaUI07Intro}',
], 'development-only intro route');
includesAll(sample, [
  "type QAUI07Intro = 'none' | 'light' | 'cinema' | 'envelope'",
  "qaUI07 && qaUI07Intro !== 'none'",
  '<WeddingIntro', 'connectToCover', 'preview',
  "showMap={qaUI07 && qaUI07Map !== 'off'}",
  '<BackgroundMusic alignToInvitation autoPlay={false}',
], 'fictional sample and integration fixture');
assert.doesNotMatch(sample, /(?:setDoc|updateDoc|deleteDoc|addDoc)\s*\(/);
includesAll(base, [
  'data-wedding-section="contact"', 'data-wedding-section="gallery"',
  'data-wedding-section="ceremony"', 'data-wedding-section="schedule"',
  'data-wedding-section="gift"', 'data-wedding-section="guestbook"',
  'id="wedding-info"', 'id="wedding-location"', 'id="wedding-accounts"',
  '<WeddingCalendarDownload', '<LocationMap', '<WeddingGallery',
  '<GiftInfoThemed', '<GuestbookThemed',
], 'public invitation');
includesAll(music, ['data-wedding-music-state', 'aria-pressed={isPlaying}',
  '<WeddingMusicGlyph', 'onRetryLoad?.()', 'controlRef.current?.focus()'], 'music');
includesAll(map, ['data-map-status={status}', 'aria-pressed={controlsEnabled}',
  "event.key === 'Escape'", '지도 앱에서 길찾기', '지도에서 위치 보기'], 'map');
includesAll(intro, ['data-wedding-intro={style}', 'connectToCover',
  'data-wedding-cover-photo', 'sessionStorage'], 'intro');
includesAll(gallery, ['role="dialog"', 'aria-modal="true"',
  '갤러리 크게 보기 닫기', 'triggerRef.current.focus()'], 'gallery');
includesAll(guestbook, ['isDemo = demoComments !== undefined',
  'onSubmit={handleSubmit}', '<details className={styles.formDisclosure}>'], 'guestbook');
includesAll(browser, [
  'THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")',
  'FAKE_KAKAO_SDK', 'FAKE_AUDIO',
  'BEGIN:VCALENDAR', 'guestbook_submissions',
  '("light", "cinema", "envelope")',
  'UI07F_BROWSER_SUMMARY',
], 'browser QA');
includesAll(android, [
  'Android API35 x86_64 Pixel 7 Pro emulator',
  'actual_physical_device_tested',
  'uiautomator', '1.6', '1.0',
  'UI07F_ANDROID_SUMMARY',
], 'Android emulator QA');
includesAll(workflow, [
  'integrated-five-theme-chromium',
  'android-api35-chrome',
  'ReactiveCircus/android-emulator-runner@',
  'api-level: 35',
  'python scripts/qa-invitation-ui07-f-browser.py',
  'python3 scripts/qa-invitation-ui07-f-android.py',
  'upload-artifact@v4',
], 'GitHub Actions UI-07-F');
assert.doesNotMatch(workflow, /firebase deploy|npm run deploy|eas submit|play console|gh pr merge/i);
console.log('UI-07-F: integrated fake-data browser, native emulator and no-deploy contracts verified');
