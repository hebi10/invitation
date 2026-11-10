import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const base = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const css = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const event = read('src/app/_components/EventInvitationPage.tsx');
const intro = read('src/components/sections/WeddingIntro/WeddingIntro.tsx');
const cover = read('src/app/_components/public-invitations/wedding/WeddingCover.tsx');
const reveal = read('src/app/_components/public-invitations/wedding/useImmediateWeddingPageReveal.ts');
const calendarDownload = read('src/app/_components/public-invitations/wedding/WeddingCalendarDownload.tsx');
const calendarFeature = read('src/app/_components/public-invitations/shared/PublicInvitationDateFeature.tsx');
const map = read('src/app/_components/public-invitations/wedding/gyeol/LocationMap.tsx');
const music = read('src/components/media/BackgroundMusic.tsx');
const musicCss = read('src/components/media/BackgroundMusic.module.css');
const gift = read('src/components/sections/GiftInfo/GiftInfoThemed.tsx');
const guestbook = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const handoff = read('docs/design/ui-07-a09-public-wedding-handoff.md');

function expectAll(source: string, needles: string[], area: string) {
  for (const needle of needles) {
    assert.ok(source.includes(needle), area + ': contract missing ' + needle);
  }
}

expectAll(base, [
  '<WeddingCover', '<nav className={styles.quickLinks}', '#wedding-info',
  '#wedding-location', '#wedding-gallery', '#wedding-accounts',
  'data-wedding-section="invitation"', 'data-wedding-section="contact"',
  'data-wedding-section="gallery"', 'data-wedding-section="ceremony"',
  'data-wedding-section="schedule"', 'data-wedding-section="transport"',
  'data-wedding-section="gift"', 'data-wedding-section="guestbook"',
  'useImmediateWeddingPageReveal(state)', 'useWeddingMotion(pageRef, theme)',
  'contacts.length > 0', 'features.showCountdown', '<WeddingCalendarDownload',
  '<PublicInvitationDateFeature', 'mode="calendar-countdown"',
  'showMap && storedContent.mapHref', '<LocationMap',
  '<GiftInfoThemed', '<GuestbookThemed', 'href={',
], 'WeddingBase');

const start = base.indexOf('return (\n    <main');
assert.ok(start >= 0, 'WeddingBase public page root missing');
const body = base.slice(start);
const order = [
  '<WeddingCover', '<nav className={styles.quickLinks}',
  'data-wedding-section="invitation"', 'data-wedding-section="contact"',
  '{gallery}', 'data-wedding-section="ceremony"',
  'data-wedding-section="schedule"', 'data-wedding-section="transport"',
  'data-wedding-section="gift"', 'data-wedding-section="guestbook"',
];
let last = -1;
for (const item of order) {
  const next = body.indexOf(item, last + 1);
  assert.ok(next > last, 'Unexpected public invitation section sequence: ' + item);
  last = next;
}

expectAll(css, [
  '--ui07-section-gap', '--ui07-summary-min-height: 48px',
  '--ui07-details-content-gap: 16px', '--ui07-action-gap',
  '--ui07-panel-padding-inline: 20px', '--ui07-panel-border',
  "[data-wedding-section='transport']", "[data-wedding-section='gift']",
  "[data-wedding-section='guestbook']", ':focus-visible',
  "data-design='simple'", "data-design='classic-r'",
  "data-design='romantic'", "data-design='gyeol'", "data-design='emotional'",
], 'UI-07-A section layout');

const contentIndex = event.indexOf('<ThemeRenderer');
const introIndex = event.indexOf('<WeddingIntro');
const musicIndex = event.indexOf('<BackgroundMusic');
assert.ok(contentIndex >= 0 && contentIndex < introIndex && introIndex < musicIndex,
  'Intro and music must remain external to public section renderer');
expectAll(event, ['normalizeWeddingIntroStyle', 'shouldRenderMusic',
  'alignToInvitation', 'autoPlay'], 'EventInvitationPage');
expectAll(intro, ['role="dialog"', 'aria-modal="true"', 'useDialogLayer(',
  'completeRef.current?.()', '[data-wedding-cover-photo]', 'sessionStorage',
  'prefers-reduced-motion: reduce'], 'WeddingIntro');
expectAll(cover, ['data-wedding-cover-photo', 'data-wedding-cover-frame'], 'WeddingCover');
expectAll(reveal, ['[role="dialog"][aria-modal="true"]', 'overflow'], 'Scroll lock');

expectAll(base, ['className={styles.contactSection}',
  '<summary className={styles.disclosureSummary}>', 'contactSummary',
  'calendarDisclosure', '교통·방문 상세 내용 보기'], 'Contact and calendar');
expectAll(calendarDownload, ['buildWeddingCalendar(', "'wedding.ics'",
  '캘린더에 저장'], 'Calendar .ics download');
expectAll(calendarFeature, ["model.mode === 'calendar-countdown'",
  'aria-current'], 'Inline wedding calendar');

expectAll(map, ['loadKakaoMapsSdk', 'mapHref', 'directionsHref',
  'aria-pressed={controlsEnabled}', '지도에서 위치 보기'], 'Public LocationMap');
expectAll(music, ['aria-pressed={isPlaying}', '음악 끄기', '음악 켜기',
  'onRetryLoad', 'onError', 'hasAutoPlayedRef.current = true'], 'Music control');
expectAll(musicCss, ['position: fixed;', 'safe-area-inset-top',
  'z-index: 30', '480px', 'calc(50vw - 228px)'], 'Music alignment');

expectAll(gift, ['<details className={styles.accountSection}>',
  '<summary className={styles.accountSummary}>', 'copyTextToClipboard'], 'Gift disclosure');
expectAll(guestbook, ['<details className={styles.formDisclosure}>',
  '<summary className={styles.formSummary}>', 'onSubmit={handleSubmit}'], 'Guestbook');

expectAll(handoff, ['UI-07-B', 'UI-07-C', 'UI-07-D', 'UI-07-E',
  'UI-07-F', 'TalkBack', 'VoiceOver', 'Firebase',
  '14ce0jgzUMbtWonlcRjqFclhdmDVZO3p2'], 'Handoff document');
console.log('UI-07-A-09: public wedding B–F interfaces and regression boundaries verified');
