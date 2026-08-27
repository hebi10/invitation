# 공개 초대장 디자인 세계관 재편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 공개 URL과 데이터 계약을 유지하면서 12개 모바일 초대장을 이벤트별로 독립된 시각 세계와 정보 구조로 재구성한다.

**Architecture:** 공개 초대장 전용 렌더러를 public-invitations 아래에 모으고, 기능적 조각만 shared에서 재사용한다. 각 theme key는 기존 레지스트리와 URL을 유지한 채 새 전용 Page.tsx를 가리키며, 값이 없는 선택 데이터는 섹션을 숨기거나 정보 조판 대체 화면으로 처리한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Firebase 데이터 로더, Node 기반 계약 테스트

**Spec:** docs/superpowers/specs/2026-08-27-public-invitation-visual-world-rebuild-design.md

## Global Constraints

- 기존 theme key, 공개 URL, Firebase/API, 인증·인가, 저장 스키마를 변경하지 않는다.
- src/lib/invitationThemes.ts는 테마 키와 라벨·경로·판매 정책의 단일 진실 공급원으로 유지한다.
- 기본 영문 키커, 큰 라운드 카드, 고정 그림자, 장식성 그라데이션, 강제 로더와 자동 인트로를 도입하지 않는다.
- 이미지·혜택·프로그램·RSVP 등 선택 데이터가 비어 있으면 미완성 문구나 빈 프레임을 표시하지 않는다.
- 모바일 핵심 행동은 44px 이상, 키보드 포커스는 :focus-visible, 보조 텍스트는 WCAG AA 대비를 만족한다.
- 새 의존성을 추가하지 않는다.
- 기존 사용자의 미커밋 변경은 stage, 수정, 되돌리기 하지 않는다.

---

## File Structure

| 경로 | 책임 |
| --- | --- |
| src/app/_components/public-invitations/shared/InvitationPoster.tsx | 이미지가 없을 때 이름·날짜·장소를 정보 조판으로 표현 |
| src/app/_components/public-invitations/shared/InvitationActionLink.tsx | 전화·메일·지도·외부 RSVP의 44px 링크 처리 |
| src/app/_components/public-invitations/wedding/*/Page.tsx | 웨딩 4개 전용 정보 순서와 서사 |
| src/app/_components/public-invitations/first-birthday/*/Page.tsx | 돌잔치 2개 전용 기록형 초대장 |
| src/app/_components/public-invitations/birthday/*/Page.tsx | 생일 2개 전용 파티·기록형 초대장 |
| src/app/_components/public-invitations/opening/*/Page.tsx | 개업 2개 전용 브랜드 초대장 |
| src/app/_components/public-invitations/general-event/*/Page.tsx | 일반행사 2개 전용 프로그램 초대장 |
| src/app/_components/themeRenderers/registry.ts 및 이벤트별 registry | 기존 key를 새 전용 페이지에 연결 |
| scripts/test-public-invitation-visual-world.mts | 구조·빈 상태·라벨·공개 경로 계약 검사 |

### Task 1: 공용 빈 상태와 행동 링크 기반

**Files:**
- Create: src/app/_components/public-invitations/shared/InvitationPoster.tsx
- Create: src/app/_components/public-invitations/shared/InvitationPoster.module.css
- Create: src/app/_components/public-invitations/shared/InvitationActionLink.tsx
- Create: src/app/_components/public-invitations/shared/InvitationActionLink.module.css
- Create: scripts/test-public-invitation-visual-world.mts
- Modify: scripts/run-test-suite.mjs

**Interfaces:**
- Produces: InvitationPoster({ eyebrow, title, dateLabel, locationLabel, tone })
- Produces: InvitationActionLink({ href, children, external })

- [ ] **Step 1: 실패하는 공용 계약 테스트를 작성한다.**

~~~ts
const poster = read('src/app/_components/public-invitations/shared/InvitationPoster.tsx');
assert.match(poster, /export function InvitationPoster/);
assert.match(poster, /dateLabel/);
assert.doesNotMatch(poster, /준비 중|이미지 없음/);

const actionCss = read('src/app/_components/public-invitations/shared/InvitationActionLink.module.css');
assert.match(actionCss, /min-height:\s*44px/);
assert.match(actionCss, /:focus-visible/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-public-invitation-visual-world.mts  
Expected: FAIL — 공용 모듈을 찾지 못함.

- [ ] **Step 3: 최소 구현을 작성한다.**

~~~tsx
export function InvitationPoster({ title, dateLabel, locationLabel }: InvitationPosterProps) {
  return (
    <section aria-label={title + ' 초대 정보'} className={styles.poster}>
      <p className={styles.date}>{dateLabel}</p>
      <h1>{title}</h1>
      {locationLabel ? <p className={styles.location}>{locationLabel}</p> : null}
    </section>
  );
}
~~~

~~~tsx
export function InvitationActionLink({ href, children, external = false }: InvitationActionLinkProps) {
  return <a className={styles.link} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}</a>;
}
~~~

- [ ] **Step 4: 테스트를 통과시킨다.**

Run: node scripts/test-public-invitation-visual-world.mts  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add scripts/test-public-invitation-visual-world.mts scripts/run-test-suite.mjs src/app/_components/public-invitations/shared
git commit -m '공개 초대장 공용 조판 기반 추가'
~~~

### Task 2: 공개 초대장 렌더러 경계 이관

**Files:**
- Create: src/app/_components/public-invitations/{wedding,first-birthday,birthday,opening,general-event}/index.ts
- Modify: src/app/_components/themeRenderers/registry.ts
- Modify: src/app/_components/{birthday,firstBirthday,opening,generalEvent}/themeRenderers/registry.ts
- Modify: src/app/_components/EventInvitationPage.tsx
- Modify: src/app/_components/{firstBirthday/FirstBirthdayInvitationPage.tsx,opening/OpeningInvitationPage.tsx,generalEvent/GeneralEventInvitationPage.tsx}
- Modify: scripts/test-classic-r-theme.mts, scripts/test-first-birthday-page-rendering.mts, scripts/test-opening-event-rendering.mts

**Interfaces:**
- Consumes: WeddingThemeRendererProps, EventPageReadyState, 기존 theme key unions.
- Produces: registry entries whose component import originates under public-invitations.

- [ ] **Step 1: 새 registry 경로를 요구하는 실패 테스트를 추가한다.**

~~~ts
const registry = read('src/app/_components/themeRenderers/registry.ts');
assert.match(registry, /public-invitations\/wedding/);
assert.ok(fs.existsSync('src/app/_components/public-invitations/opening/index.ts'));
assert.ok(fs.existsSync('src/app/_components/public-invitations/general-event/index.ts'));
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-public-invitation-visual-world.mts  
Expected: FAIL — 새 index와 registry import가 없음.

- [ ] **Step 3: 기존 renderer를 책임 기반 폴더로 이관한다.**

기존 markup·데이터 훅·theme key는 그대로 둔다. 첫 단계에서는 화면 결과를 바꾸지 않는다. 역할이 불분명한 shared.tsx는 Page.tsx 또는 WeddingScheduleSection.tsx, OpeningBenefitsSection.tsx, ProgramTimelineSection.tsx처럼 책임 기반 파일로 나눈다.

~~~ts
export { default as LetterpressPage } from './letterpress/Page';
export { default as PortraitLetterPage } from './portrait-letter/Page';
~~~

- [ ] **Step 4: 기존 URL 계약과 새 구조를 확인한다.**

Run: node scripts/test-public-invitation-visual-world.mts; node scripts/test-classic-r-theme.mts; node scripts/test-first-birthday-page-rendering.mts; node scripts/test-opening-event-rendering.mts  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations src/app/_components/themeRenderers src/app/_components/birthday src/app/_components/firstBirthday src/app/_components/opening src/app/_components/generalEvent src/app/_components/EventInvitationPage.tsx scripts/test-classic-r-theme.mts scripts/test-first-birthday-page-rendering.mts scripts/test-opening-event-rendering.mts scripts/test-public-invitation-visual-world.mts
git commit -m '공개 초대장 렌더러 구조 정리'
~~~

### Task 3: 웨딩 Letterpress 대표 테마

**Files:**
- Create: src/app/_components/public-invitations/wedding/letterpress/Page.tsx
- Create: src/app/_components/public-invitations/wedding/letterpress/styles.module.css
- Modify: src/app/_components/public-invitations/wedding/index.ts
- Modify: src/app/_components/themeRenderers/registry.ts
- Modify: scripts/test-classic-r-theme.mts, scripts/test-wedding-theme-style-contracts.mts

**Interfaces:**
- Consumes: WeddingThemeRendererProps, getThemePageData, getCeremonySchedule, getCeremonyAddress, shouldShowGiftInfo.
- Produces: LetterpressPage bound to existing classic-r key.

- [ ] **Step 1: 순서와 금지 문법을 검사하는 실패 테스트를 작성한다.**

~~~ts
const page = read('src/app/_components/public-invitations/wedding/letterpress/Page.tsx');
assert.match(page, /InvitationPoster/);
assert.match(page, /getCeremonySchedule/);
assert.doesNotMatch(page, /Scroll/);
const css = read('src/app/_components/public-invitations/wedding/letterpress/styles.module.css');
assert.doesNotMatch(css, /border-radius:\s*(?:[1-9]|\d{2,})px|999px/);
assert.doesNotMatch(css, /box-shadow/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-classic-r-theme.mts; node scripts/test-wedding-theme-style-contracts.mts  
Expected: FAIL — Letterpress 모듈이 없음.

- [ ] **Step 3: 사진·이름·날짜 → 초대 문장 → 일정/장소 → 연락처/계좌 → 갤러리/방명록 순서로 구현한다.**

~~~tsx
const hero = state.mainImageUrl
  ? <img src={state.mainImageUrl} alt={page.displayName + ' 대표 사진'} />
  : <InvitationPoster title={page.displayName} dateLabel={page.date} locationLabel={page.venue} tone="paper" />;

return <main className={styles.page}>{hero}{invitation}{schedule}{contact}{gift}{gallery}{guestbook}</main>;
~~~

imagesLoading 때문에 본문을 숨기거나 최소 시간을 기다리지 않는다. 기존 갤러리·방명록의 접근성 동작은 재사용한다.

- [ ] **Step 4: 웨딩 계약과 타입 검증을 통과시킨다.**

Run: node scripts/test-classic-r-theme.mts; node scripts/test-wedding-theme-style-contracts.mts; npm run typecheck:web  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations/wedding/letterpress src/app/_components/public-invitations/wedding/index.ts src/app/_components/themeRenderers/registry.ts scripts/test-classic-r-theme.mts scripts/test-wedding-theme-style-contracts.mts
git commit -m '웨딩 레터프레스 테마 재구성'
~~~

### Task 4: 돌잔치 First Chapter 대표 테마

**Files:**
- Create: src/app/_components/public-invitations/first-birthday/first-chapter/Page.tsx
- Create: src/app/_components/public-invitations/first-birthday/first-chapter/styles.module.css
- Modify: src/app/_components/public-invitations/first-birthday/index.ts
- Modify: src/app/_components/firstBirthday/themeRenderers/registry.ts
- Modify: scripts/test-first-birthday-page-rendering.mts, scripts/test-public-invitation-visual-world.mts

**Interfaces:**
- Consumes: EventPageReadyState, buildFirstBirthdayInvitationViewModel, InvitationPoster.
- Produces: FirstChapterPage bound to first-birthday-pink.

- [ ] **Step 1: 빈 대표 이미지와 성장 기록 구조의 실패 테스트를 작성한다.**

~~~ts
const page = read('src/app/_components/public-invitations/first-birthday/first-chapter/Page.tsx');
assert.match(page, /buildFirstBirthdayInvitationViewModel/);
assert.match(page, /InvitationPoster/);
assert.doesNotMatch(page, /First Birthday/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-first-birthday-page-rendering.mts; node scripts/test-public-invitation-visual-world.mts  
Expected: FAIL — 새 renderer가 없음.

- [ ] **Step 3: 아이 이름·나이·날짜 → 성장 한 장면 → 파티 일정 → 오시는 길 → 축하 메시지를 구현한다.**

대표 이미지가 없으면 InvitationPoster를 사용한다. 갤러리가 비어 있으면 성장 사진 영역 전체를 렌더링하지 않는다. 데이터가 없는 연락처·지도·방명록은 각각 숨긴다.

- [ ] **Step 4: 돌잔치 렌더링과 타입 검증을 통과시킨다.**

Run: node scripts/test-first-birthday-page-rendering.mts; npm run typecheck:web  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations/first-birthday src/app/_components/firstBirthday/themeRenderers/registry.ts scripts/test-first-birthday-page-rendering.mts scripts/test-public-invitation-visual-world.mts
git commit -m '돌잔치 퍼스트 챕터 테마 재구성'
~~~

### Task 5: 개업 Studio Opening 대표 테마

**Files:**
- Create: src/app/_components/public-invitations/opening/studio-opening/Page.tsx
- Create: src/app/_components/public-invitations/opening/studio-opening/styles.module.css
- Modify: src/app/_components/public-invitations/opening/index.ts
- Modify: src/app/_components/opening/OpeningInvitationPage.tsx
- Modify: scripts/test-opening-event-rendering.mts, scripts/test-public-invitation-visual-world.mts

**Interfaces:**
- Consumes: EventPageReadyState, buildOpeningInvitationViewModel, InvitationActionLink, InvitationPoster.
- Produces: StudioOpeningPage bound to opening-natural without an entry-only screen.

- [ ] **Step 1: 인트로 제거와 선택 섹션 숨김을 검사하는 실패 테스트를 작성한다.**

~~~ts
const page = read('src/app/_components/public-invitations/opening/studio-opening/Page.tsx');
assert.match(page, /buildOpeningInvitationViewModel/);
assert.doesNotMatch(page, /초대장 열기|오픈 준비 중/);
assert.match(page, /model\.benefitItems\.length/);
assert.match(page, /InvitationActionLink/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-opening-event-rendering.mts; node scripts/test-public-invitation-visual-world.mts  
Expected: FAIL — Studio Opening 구현이 없음.

- [ ] **Step 3: 브랜드명/한 줄 소개 → 공간·서비스 → 오픈 혜택 → 방문 정보를 구현한다.**

~~~tsx
{model.benefitItems.length > 0 ? (
  <section aria-labelledby="benefits-title">
    <h2 id="benefits-title">오픈 혜택</h2>
    {model.benefitItems.map((item) => <p key={item.title}>{item.title} {item.content}</p>)}
  </section>
) : null}
{model.mapUrl ? <InvitationActionLink href={model.mapUrl} external>지도에서 길찾기</InvitationActionLink> : null}
~~~

자동 인트로와 가로 pill 내비게이션을 삭제하고 44px 행동 링크와 키보드 포커스를 유지한다.

- [ ] **Step 4: 개업 렌더링·타입 검증을 통과시킨다.**

Run: node scripts/test-opening-event-rendering.mts; npm run typecheck:web  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations/opening src/app/_components/opening/OpeningInvitationPage.tsx scripts/test-opening-event-rendering.mts scripts/test-public-invitation-visual-world.mts
git commit -m '개업 스튜디오 오프닝 테마 재구성'
~~~

### Task 6: 일반행사 Program Edition 대표 테마

**Files:**
- Create: src/app/_components/public-invitations/general-event/program-edition/Page.tsx
- Create: src/app/_components/public-invitations/general-event/program-edition/styles.module.css
- Modify: src/app/_components/public-invitations/general-event/index.ts
- Modify: src/app/_components/generalEvent/GeneralEventInvitationPage.tsx
- Modify: scripts/test-opening-event-rendering.mts, scripts/test-public-invitation-visual-world.mts

**Interfaces:**
- Consumes: EventPageReadyState, buildGeneralEventViewModel, InvitationActionLink.
- Produces: ProgramEditionPage bound to general-event-elegant.

- [ ] **Step 1: 프로그램 타임라인과 RSVP 비노출 계약의 실패 테스트를 추가한다.**

~~~ts
const page = read('src/app/_components/public-invitations/general-event/program-edition/Page.tsx');
assert.match(page, /buildGeneralEventViewModel/);
assert.match(page, /model\.programItems\.map/);
assert.doesNotMatch(page, /참석 응답 기능은 준비 중/);
assert.match(page, /contactEmail \|\| model\.contactPhone/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-opening-event-rendering.mts; node scripts/test-public-invitation-visual-world.mts  
Expected: FAIL — Program Edition 구현이 없음.

- [ ] **Step 3: 포스터형 행사 정보 → 세로 프로그램 → 실제 참여 방법 → 방문 정보 순서로 구현한다.**

~~~tsx
const canRespond = Boolean(model.contactEmail || model.contactPhone);
{canRespond ? (
  <section aria-labelledby="response-title">
    <h2 id="response-title">참여 문의</h2>
    {model.contactEmail ? <InvitationActionLink href={'mailto:' + model.contactEmail}>{model.contactEmail}</InvitationActionLink> : null}
    {model.contactPhone ? <InvitationActionLink href={'tel:' + model.contactPhone}>{model.contactPhone}</InvitationActionLink> : null}
  </section>
) : null}
~~~

시간·제목·설명은 ol로 렌더링하고, 메일과 전화는 유효한 mailto: 또는 tel: 링크에만 연결한다.

- [ ] **Step 4: 일반행사 계약과 타입 검증을 통과시킨다.**

Run: node scripts/test-opening-event-rendering.mts; npm run typecheck:web  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations/general-event src/app/_components/generalEvent/GeneralEventInvitationPage.tsx scripts/test-opening-event-rendering.mts scripts/test-public-invitation-visual-world.mts
git commit -m '일반행사 프로그램 에디션 테마 재구성'
~~~

### Task 7: 나머지 웨딩 3종 확장

**Files:**
- Create: src/app/_components/public-invitations/wedding/{portrait-letter,garden-note,quiet-ceremony}/{Page.tsx,styles.module.css}
- Modify: src/app/_components/public-invitations/wedding/index.ts, src/app/_components/themeRenderers/registry.ts
- Modify: scripts/test-wedding-theme-style-contracts.mts, scripts/test-public-invitation-visual-world.mts

**Interfaces:**
- Produces: PortraitLetterPage → emotional, GardenNotePage → romantic, QuietCeremonyPage → simple.

- [ ] **Step 1: 세 키의 전용 페이지와 상호 다른 히어로 계약을 실패 테스트로 작성한다.**

~~~ts
for (const name of ['portrait-letter', 'garden-note', 'quiet-ceremony']) {
  assert.ok(fs.existsSync('src/app/_components/public-invitations/wedding/' + name + '/Page.tsx'));
}
assert.doesNotMatch(read('src/app/_components/public-invitations/wedding/garden-note/styles.module.css'), /border-radius:\s*999px/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-wedding-theme-style-contracts.mts  
Expected: FAIL — 전용 페이지가 아직 없음.

- [ ] **Step 3: 세 테마를 구현한다.**

- Portrait Letter: 세로 사진·짧은 편지·일정·장소
- Garden Note: 식물성 선 장식 하나·인사말·예식 정보·가족 연락처
- Quiet Ceremony: 정보 조판·일정·장소·계좌·방명록

세 구현 모두 기존 웨딩 데이터 헬퍼와 접근 가능한 갤러리/방명록을 사용하고, InvitationPoster로 빈 히어로를 처리한다.

- [ ] **Step 4: 웨딩 스타일·접근성·성능 테스트를 실행한다.**

Run: node scripts/test-wedding-theme-style-contracts.mts; node scripts/test-wedding-theme-accessibility.mts; node scripts/test-wedding-theme-performance.mts  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations/wedding src/app/_components/themeRenderers/registry.ts scripts/test-wedding-theme-style-contracts.mts scripts/test-wedding-theme-accessibility.mts scripts/test-wedding-theme-performance.mts scripts/test-public-invitation-visual-world.mts
git commit -m '웨딩 테마 서사형 확장'
~~~

### Task 8: 돌잔치·생일의 나머지 3종 확장

**Files:**
- Create: src/app/_components/public-invitations/first-birthday/dawn-chapter/{Page.tsx,styles.module.css}
- Create: src/app/_components/public-invitations/birthday/{party-notes,birthday-story}/{Page.tsx,styles.module.css}
- Modify: src/app/_components/public-invitations/{first-birthday,birthday}/index.ts
- Modify: src/app/_components/{firstBirthday,birthday}/themeRenderers/registry.ts
- Modify: scripts/test-first-birthday-page-rendering.mts, scripts/test-birthday-event-rendering.mts, scripts/test-public-invitation-visual-world.mts

**Interfaces:**
- Produces: DawnChapterPage → first-birthday-mint, PartyNotesPage → birthday-minimal, BirthdayStoryPage → birthday-floral.

- [ ] **Step 1: 각 theme key의 전용 페이지와 빈 이미지 조판 테스트를 작성한다.**

~~~ts
assert.match(read('src/app/_components/public-invitations/first-birthday/dawn-chapter/Page.tsx'), /InvitationPoster/);
assert.match(read('src/app/_components/public-invitations/birthday/party-notes/Page.tsx'), /buildBirthdayInvitationViewModel/);
assert.match(read('src/app/_components/public-invitations/birthday/birthday-story/Page.tsx'), /galleryImageUrls\.length/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-first-birthday-page-rendering.mts; node scripts/test-birthday-event-rendering.mts  
Expected: FAIL — 세 전용 페이지가 없음.

- [ ] **Step 3: 세 테마를 구현한다.**

- Dawn Chapter: 차분한 여백과 날짜 기록, 갤러리가 있을 때만 성장 장면
- Party Notes: 시간표·장소·연락처를 우선한 파티 메모
- Birthday Story: 사진과 축하 문장을 중심으로 한 짧은 기록

모든 테마에서 이미지가 없으면 InvitationPoster, 지도·연락처·방명록은 데이터가 있을 때만 렌더링한다.

- [ ] **Step 4: 렌더링 테스트와 타입체크를 실행한다.**

Run: node scripts/test-first-birthday-page-rendering.mts; node scripts/test-birthday-event-rendering.mts; npm run typecheck:web  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations/first-birthday src/app/_components/public-invitations/birthday src/app/_components/firstBirthday/themeRenderers/registry.ts src/app/_components/birthday/themeRenderers/registry.ts scripts/test-first-birthday-page-rendering.mts scripts/test-birthday-event-rendering.mts scripts/test-public-invitation-visual-world.mts
git commit -m '돌잔치 생일 챕터 테마 확장'
~~~

### Task 9: 개업·일반행사의 나머지 2종 확장

**Files:**
- Create: src/app/_components/public-invitations/opening/opening-poster/{Page.tsx,styles.module.css}
- Create: src/app/_components/public-invitations/general-event/night-schedule/{Page.tsx,styles.module.css}
- Modify: src/app/_components/public-invitations/{opening,general-event}/index.ts
- Modify: src/app/_components/{opening/OpeningInvitationPage.tsx,generalEvent/GeneralEventInvitationPage.tsx}
- Modify: scripts/test-opening-event-rendering.mts, scripts/test-public-invitation-visual-world.mts

**Interfaces:**
- Produces: OpeningPosterPage → opening-modern, NightSchedulePage → general-event-vivid.

- [ ] **Step 1: 강제 인트로와 미구현 RSVP 부재를 검사하는 실패 테스트를 작성한다.**

~~~ts
const opening = read('src/app/_components/public-invitations/opening/opening-poster/Page.tsx');
const event = read('src/app/_components/public-invitations/general-event/night-schedule/Page.tsx');
assert.doesNotMatch(opening, /초대장 열기|오픈 준비 중/);
assert.doesNotMatch(event, /참석 응답 기능은 준비 중/);
assert.match(event, /model\.programItems\.map/);
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-opening-event-rendering.mts  
Expected: FAIL — 두 전용 페이지가 없음.

- [ ] **Step 3: Opening Poster와 Night Schedule을 구현한다.**

Opening Poster는 브랜드명·오픈일·방문 행동을 포스터형 조판으로, Night Schedule은 대담한 행사명과 세로 프로그램으로 구성한다. 두 테마 모두 데이터가 없는 혜택·참여 수단·지도는 숨긴다.

- [ ] **Step 4: 이벤트 렌더링과 타입체크를 통과시킨다.**

Run: node scripts/test-opening-event-rendering.mts; npm run typecheck:web  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/app/_components/public-invitations/opening src/app/_components/public-invitations/general-event src/app/_components/opening/OpeningInvitationPage.tsx src/app/_components/generalEvent/GeneralEventInvitationPage.tsx scripts/test-opening-event-rendering.mts scripts/test-public-invitation-visual-world.mts
git commit -m '개업 일반행사 테마 확장'
~~~

### Task 10: 테마 메타데이터와 가이드 문구 교체

**Files:**
- Modify: src/lib/invitationThemes.ts
- Modify: src/lib/birthdayThemes.ts, src/lib/firstBirthdayThemes.ts, src/lib/openingThemes.ts, src/lib/generalEventThemes.ts
- Modify: scripts/test-classic-r-theme.mts, scripts/test-admin-event-preview-links.mts, scripts/test-public-invitation-visual-world.mts

**Interfaces:**
- Consumes: existing theme key arrays and getInvitationThemeDefinition APIs.
- Produces: 기존 key와 path suffix를 보존한 새 사용자 라벨·설명·미리보기 설명.

- [ ] **Step 1: 새 사용자 라벨과 경로 보존을 요구하는 실패 테스트를 작성한다.**

~~~ts
assert.equal(getInvitationThemeDefinition('classic-r').label, '레터프레스');
assert.equal(getInvitationThemePathSuffix('classic-r'), '/classic-r');
assert.equal(getOpeningTheme('opening-natural').label, '스튜디오 오프닝');
assert.equal(getGeneralEventTheme('general-event-elegant').label, '프로그램 에디션');
~~~

- [ ] **Step 2: 실패를 확인한다.**

Run: node scripts/test-classic-r-theme.mts; node scripts/test-admin-event-preview-links.mts; node scripts/test-public-invitation-visual-world.mts  
Expected: FAIL — 기존 사용자 라벨과 설명이 남아 있음.

- [ ] **Step 3: 키·경로·판매 정책을 바꾸지 않고 라벨·설명·샘플 설명만 갱신한다.**

~~~ts
'classic-r': {
  label: '레터프레스',
  adminLabel: '레터프레스',
  variantLabel: '레터프레스',
  pathSuffix: '/classic-r',
}
~~~

preview.sampleUrls는 기존 검증된 URL을 유지한다. 페이지 UI에 표시되는 설명만 새 세계관과 일치시킨다.

- [ ] **Step 4: 메타데이터와 프리뷰 링크 회귀 테스트를 통과시킨다.**

Run: node scripts/test-classic-r-theme.mts; node scripts/test-admin-event-preview-links.mts; node scripts/test-opening-event-rendering.mts  
Expected: PASS.

- [ ] **Step 5: 커밋한다.**

~~~powershell
git add src/lib/invitationThemes.ts src/lib/birthdayThemes.ts src/lib/firstBirthdayThemes.ts src/lib/openingThemes.ts src/lib/generalEventThemes.ts scripts/test-classic-r-theme.mts scripts/test-admin-event-preview-links.mts scripts/test-public-invitation-visual-world.mts
git commit -m '초대장 테마 명칭 개편'
~~~

### Task 11: 전체 검증과 시각 QA

**Files:**
- Modify: 앞선 작업에서 발견한 테스트 경로 또는 접근성 계약 파일만 수정

**Interfaces:**
- Consumes: Tasks 1-10의 공개 renderer, registry, 메타데이터.
- Produces: 회귀 없는 공개 초대장 UI와 검증 기록.

- [ ] **Step 1: 전체 공개 테마 계약을 실행한다.**

Run: node scripts/test-public-invitation-visual-world.mts; node scripts/test-wedding-theme-accessibility.mts; node scripts/test-wedding-theme-performance.mts; node scripts/test-wedding-theme-style-contracts.mts; node scripts/test-first-birthday-page-rendering.mts; node scripts/test-birthday-event-rendering.mts; node scripts/test-opening-event-rendering.mts; node scripts/test-admin-event-preview-links.mts  
Expected: PASS.

- [ ] **Step 2: 정적 품질 검증을 실행한다.**

Run: npm run lint:web; npm run typecheck:web  
Expected: PASS.

- [ ] **Step 3: 브라우저로 12개 공개 URL을 모바일 390×844와 데스크톱에서 확인한다.**

확인 항목: 가로 넘침 없음, 첫 화면 즉시 노출, 빈 이미지 포스터, 빈 RSVP 비노출, 긴 이름 줄바꿈, 44px 행동 링크, 키보드 포커스, 콘솔 오류 없음.

- [ ] **Step 4: Impeccable detector를 한 번 실행하고 실제 위반만 수정한다.**

Run: node C:\Users\박도영\.agents\skills\impeccable\scripts\detect.mjs --json src/app/_components/public-invitations  
Expected: 테마 전용 색·서체 advisory는 DESIGN.md의 운영 UI 범위와 분리해 오탐으로 기록하고, 접근성·과한 반경·그림자처럼 설계 원칙을 위반한 항목만 수정한다.

- [ ] **Step 5: 최종 수정만 커밋한다.**

~~~powershell
git add scripts src/app/_components/public-invitations src/app/_components/themeRenderers src/app/_components/birthday src/app/_components/firstBirthday src/app/_components/opening src/app/_components/generalEvent src/lib
git commit -m '공개 초대장 디자인 검증 보완'
~~~

## Self-Review

- Spec coverage: 파일 구조(Task 2), 대표 4종(Tasks 3-6), 나머지 8종(Tasks 7-9), 메타데이터(Task 10), 빈 상태·접근성·반응형·검증(Task 1 및 Task 11)을 모두 다룬다.
- Placeholder scan: 금지된 임시 표기와 모호한 후속 구현 지시를 제거했다.
- Type consistency: 모든 이벤트 페이지는 기존 WeddingThemeRendererProps 또는 EventPageReadyState를 소비하고, registry는 기존 key를 새 Page export에 연결한다.
