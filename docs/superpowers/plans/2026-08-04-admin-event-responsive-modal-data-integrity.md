# Admin Event Responsive Modal and Data Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 이벤트 상세를 모든 화면 크기에서 중앙 팝업으로 제공하고, 저장 콘텐츠가 없는 알려진 이벤트의 행사일·장소 요약을 기존 샘플 데이터에서 안전하게 보완한다.

**Architecture:** 이벤트 목록의 URL 선택 상태는 유지하되 상세 UI는 `document.body` 포털 기반 대화상자로 렌더링하여 목록 레이아웃과 분리한다. 관리자 요약 서비스는 저장 콘텐츠를 우선 사용하고, 콘텐츠가 없을 때만 기존 샘플 레지스트리를 읽어 날짜·장소 등 표시 데이터를 보완한다. 공개 상태·소유권·노출 기간은 계속 이벤트 요약 레코드를 기준으로 한다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, Firebase Admin/Firestore, Node `assert` 기반 `tsx` 테스트

## Global Constraints

- 데스크톱과 모바일 모두 하단 시트가 아닌 중앙 팝업을 사용한다.
- 모바일에서도 상세 정보·운영 설정·관련 관리·위험 작업을 숨기지 않는다.
- 공개 라우트, API 응답 필드 이름, 인증·인가 정책, 저장 스키마를 변경하지 않는다.
- 새 UI 의존성을 추가하지 않고 기존 관리자 토큰과 버튼 스타일을 재사용한다.
- 기존 사용자 변경인 `src/app/page.tsx`, `src/app/page.module.css`는 수정하지 않는다.
- 사용자 요청 없이 커밋, 푸시, 배포하지 않는다. 이 계획의 커밋 단계는 의도적으로 생략한다.

---

## File Structure

- `src/server/adminInvitationPagesService.ts`: 이벤트 요약과 저장/샘플 콘텐츠를 조합하여 관리자 요약 DTO를 생성한다.
- `src/app/admin/_components/AdminEventWorkspace.tsx`: 목록 선택 상태와 상세 팝업 열기/닫기, 닫힌 뒤 포커스 복원을 관리한다.
- `src/app/admin/_components/AdminEventDetailPanel.tsx`: 포털, 배경, 대화상자 의미 구조, 포커스 트랩, 본문 내용을 담당한다.
- `src/app/admin/_components/AdminEventList.tsx`: 데스크톱 이벤트 선택 버튼에 대화상자 호출 의미를 제공한다.
- `src/app/admin/_components/AdminEventMobileList.tsx`: 모바일 이벤트 선택 버튼에 같은 대화상자 호출 의미를 제공한다.
- `src/app/admin/page.module.css`: 중앙 팝업과 반응형 내부 배치를 정의하고 기존 사이드 패널/하단 시트 규칙을 제거한다.
- `scripts/test-admin-invitation-summary.mts`: 관리자 요약의 저장 콘텐츠 우선순위와 샘플 폴백을 검증한다.
- `scripts/test-admin-event-detail-dialog-contract.mts`: 팝업 의미 구조와 반응형 CSS 계약을 검증한다.
- `scripts/run-test-suite.mjs`: 새 테스트 두 개를 core 묶음에 등록한다.

---

### Task 1: 관리자 이벤트 요약 데이터 폴백

**Files:**
- Create: `scripts/test-admin-invitation-summary.mts`
- Modify: `src/server/adminInvitationPagesService.ts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: `EventSummaryRecord`, `EventContentRecordDto | null`, `Set<string>` 관리자 UID
- Produces: `resolveAdminInvitationPage(summary, contentRecord)`과 `buildAdminInvitationPageSummary(summary, page, adminUserIds, source)` 테스트 가능 함수

- [ ] **Step 1: 관리자 요약 폴백 실패 테스트 작성**

`scripts/test-admin-invitation-summary.mts`에 다음 세 경우를 만든다.

```ts
import assert from 'node:assert/strict';

import {
  buildAdminInvitationPageSummary,
  resolveAdminInvitationPage,
} from '../src/server/adminInvitationPagesService.ts';
import type { EventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos.ts';

function makeSummary(overrides: Partial<EventSummaryRecord> = {}): EventSummaryRecord {
  return {
    eventId: 'event-1',
    slug: 'opening-bloom-cafe',
    eventType: 'opening',
    status: 'active',
    ownerUid: null,
    ownerEmail: null,
    ownerDisplayName: null,
    title: '블룸 카페 운영본',
    displayName: '블룸 카페 운영본',
    summary: null,
    supportedVariants: ['opening-natural'],
    published: true,
    defaultTheme: 'opening-natural',
    featureFlags: {},
    commentCount: 0,
    ticketCount: 0,
    ticketBalance: 0,
    security: null,
    visibility: null,
    displayPeriod: null,
    hasCustomContent: false,
    createdAt: null,
    updatedAt: null,
    lastSavedAt: null,
    version: 1,
    migratedFromPageSlug: null,
    ...overrides,
  };
}

const summary = makeSummary();
const fallback = resolveAdminInvitationPage(summary, null);
assert.equal(fallback.source, 'sample');
assert.equal(fallback.page?.date, '2026년 5월 18일 월요일');
assert.equal(fallback.page?.venue, '블룸 카페 성수');

const fallbackSummary = buildAdminInvitationPageSummary(
  summary,
  fallback.page,
  new Set(),
  fallback.source
);
assert.equal(fallbackSummary.displayName, '블룸 카페 운영본');
assert.equal(fallbackSummary.date, fallback.page?.date);
assert.equal(fallbackSummary.venue, fallback.page?.venue);

const stored = resolveAdminInvitationPage(summary, {
  slug: summary.slug,
  config: {
    ...fallback.page!,
    displayName: '사용자 저장 이름',
    date: '2027년 1월 2일',
    venue: '사용자 저장 장소',
  },
  createdAt: null,
  updatedAt: null,
  seedSourceSlug: null,
});
assert.equal(stored.source, 'stored');
assert.equal(stored.page?.date, '2027년 1월 2일');

const unknown = resolveAdminInvitationPage(
  makeSummary({ slug: 'unknown-event', eventType: 'general-event' }),
  null
);
assert.deepEqual(unknown, { page: null, source: 'none' });
```

샘플 날짜의 정확한 기대값은 `src/config/eventSamplePages.ts`의 `buildDateLabel` 결과를 한 번 실행해 확인한 값으로 고정한다. 테스트에 추측한 날짜 문자열을 남기지 않는다.

- [ ] **Step 2: 새 테스트가 함수 미정의로 실패하는지 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-invitation-summary.mts`

Expected: `resolveAdminInvitationPage` 또는 `buildAdminInvitationPageSummary` export가 없어 FAIL.

- [ ] **Step 3: 저장 콘텐츠 우선·샘플 폴백 구현**

`src/server/adminInvitationPagesService.ts`에서 기존 내부 builder를 export하고 다음 source 타입과 resolver를 추가한다.

```ts
import {
  createInvitationPageFromSeed,
  getWeddingPageBySlug,
} from '@/config/weddingPages';
import { getEventSamplePageBySlug } from '@/config/eventSamplePages';
import type { EventContentRecordDto } from './repositories/eventReadThroughDtos';

export type AdminInvitationPageSource = 'stored' | 'sample' | 'none';

export function resolveAdminInvitationPage(
  summary: EventSummaryRecord,
  contentRecord: EventContentRecordDto | null
) {
  const published = summary.visibility?.published ?? summary.published;
  if (contentRecord) {
    return {
      page: createInvitationPageFromSeed(contentRecord.config, { published }),
      source: 'stored' as const,
    };
  }

  const eventSample = getEventSamplePageBySlug(summary.slug);
  if (eventSample) {
    return {
      page: { ...eventSample, published },
      source: 'sample' as const,
    };
  }

  const weddingSample = getWeddingPageBySlug(summary.slug);
  if (!weddingSample) return { page: null, source: 'none' as const };

  return {
    page: createInvitationPageFromSeed(weddingSample, { published }),
    source: 'sample' as const,
  };
}
```

`buildAdminInvitationPageSummary`에 source를 전달하고, 이름은 저장 콘텐츠일 때만 콘텐츠 값을 우선한다. 날짜와 장소는 두 콘텐츠 source 모두 사용한다.

```ts
const displayName =
  (source === 'stored' ? page?.displayName : null) ||
  summary.displayName ||
  summary.title ||
  page?.displayName ||
  summary.slug;
```

`listAdminInvitationPageSummaries`에서는 콘텐츠 유무를 직접 판별하던 기존 삼항 연산자 분기를 resolver 호출로 교체한다. 공개 상태·소유권·노출 기간·수정 시각 계산은 변경하지 않는다.

- [ ] **Step 4: 요약 테스트 통과 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-invitation-summary.mts`

Expected: `admin invitation summary checks passed` 출력과 exit 0.

- [ ] **Step 5: core 테스트 레지스트리에 등록**

`scripts/run-test-suite.mjs`의 `core` 배열에서 기존 관리자 테스트와 함께 `'test-admin-invitation-summary'`를 추가한다.

- [ ] **Step 6: 기존 샘플 폴백 회귀 검증**

Run: `npm test -- test-sample-invitation-fallback`

Expected: 기존 샘플 폴백 테스트 PASS.

---

### Task 2: 상세 패널을 반응형 중앙 팝업으로 전환

**Files:**
- Create: `scripts/test-admin-event-detail-dialog-contract.mts`
- Modify: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Modify: `src/app/admin/_components/AdminEventDetailPanel.tsx`
- Modify: `src/app/admin/_components/AdminEventList.tsx`
- Modify: `src/app/admin/_components/AdminEventMobileList.tsx`
- Modify: `src/app/admin/page.module.css`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: 기존 `AdminEventDetailPanelProps`에서 `isMobileSheet`을 제외한 나머지 mutation·navigation callbacks
- Produces: 모든 뷰포트에서 동일한 `role="dialog"`, `aria-modal="true"` 중앙 팝업과 기존 `event=<slug>` URL 상태

- [ ] **Step 1: 팝업 계약 실패 테스트 작성**

`scripts/test-admin-event-detail-dialog-contract.mts`에서 파일 내용을 읽고 다음 계약을 검증한다.

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

const detail = fs.readFileSync(
  'src/app/admin/_components/AdminEventDetailPanel.tsx',
  'utf8'
);
const workspace = fs.readFileSync(
  'src/app/admin/_components/AdminEventWorkspace.tsx',
  'utf8'
);
const desktopList = fs.readFileSync(
  'src/app/admin/_components/AdminEventList.tsx',
  'utf8'
);
const mobileList = fs.readFileSync(
  'src/app/admin/_components/AdminEventMobileList.tsx',
  'utf8'
);
const css = fs.readFileSync('src/app/admin/page.module.css', 'utf8');

assert.match(detail, /createPortal/);
assert.match(detail, /role="dialog"/);
assert.match(detail, /aria-modal="true"/);
assert.match(detail, /document\.body\.style\.overflow/);
assert.doesNotMatch(detail, /isMobileSheet/);
assert.doesNotMatch(workspace, /matchMedia/);
assert.match(desktopList, /aria-haspopup="dialog"/);
assert.match(mobileList, /aria-haspopup="dialog"/);
assert.match(css, /\.eventDetailBackdrop[\s\S]*place-items:\s*center/);
assert.match(css, /width:\s*min\(760px,\s*calc\(100vw - 32px\)\)/);
assert.match(css, /max-height:\s*calc\(100dvh - 32px\)/);
assert.doesNotMatch(css, /\.eventWorkspaceContent:has\(\.eventDetailPanel\)/);
```

- [ ] **Step 2: 기존 사이드 패널 구조에서 계약 실패 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-event-detail-dialog-contract.mts`

Expected: `createPortal`, 항상 적용되는 dialog semantics 또는 중앙 배치 CSS가 없어 FAIL.

- [ ] **Step 3: Workspace의 뷰포트 분기와 별도 backdrop 제거**

`AdminEventWorkspace.tsx`에서 다음을 제거한다.

- `useState` import와 `isMobileViewport` state
- `window.matchMedia('(max-width: 767px)')` effect
- `eventDetailMobileBackdrop` 버튼
- `isMobileSheet` prop 전달

선택 상태와 `closeDetail`의 query 정리·포커스 복원은 유지한다.

```tsx
{selectedPage ? (
  <AdminEventDetailPanel
    page={selectedPage}
    updatingPublished={updatingPublishedSlug === selectedPage.slug}
    updatingTier={updatingTierSlug === selectedPage.slug}
    updatingVariantToken={updatingVariantToken}
    deleting={deletingSlug === selectedPage.slug}
    issuingInvite={issuingInviteSlug === selectedPage.slug}
    onClose={closeDetail}
    onTogglePublished={onTogglePublished}
    onChangeTier={onChangeTier}
    onEnableVariant={onEnableVariant}
    onDisableVariant={onDisableVariant}
    onOpenRelated={onQueryChange}
    onIssueOwnershipInvite={onIssueOwnershipInvite}
    onDelete={onDelete}
    routes={routes}
    experience={experience}
  />
) : null}
```

- [ ] **Step 4: DetailPanel을 body 포털 대화상자로 변경**

`AdminEventDetailPanel.tsx`에서 `createPortal`을 import하고 `isMobileSheet` prop과 조건을 제거한다. 기존 반환부의 `<aside>` 시작·종료 태그만 다음 diff처럼 포털 배경과 `<section>`으로 교체한다.

```diff
+ import { createPortal } from 'react-dom';

- return (
-   <aside
+ return createPortal(
+   <div
+     className={styles.eventDetailBackdrop}
+     role="presentation"
+     onMouseDown={(event) => {
+       if (event.target === event.currentTarget) onClose();
+     }}
+   >
+   <section
      id="admin-event-detail"
      ref={panelRef}
      className={styles.eventDetailPanel}
-     aria-label="이벤트 상세"
-     aria-labelledby={isMobileSheet ? 'admin-event-detail-title' : undefined}
-     aria-modal={isMobileSheet || undefined}
-     role={isMobileSheet ? 'dialog' : undefined}
+     role="dialog"
+     aria-modal="true"
+     aria-labelledby="admin-event-detail-title"
      onKeyDown={handlePanelKeyDown}
    >

-   </aside>
- );
+   </section>
+   </div>,
+   document.body
+ );
```

포커스 트랩은 모든 화면 크기에서 실행하고, 열릴 때 닫기 버튼에 포커스한다. `Escape` listener는 유지한다. 팝업 생명주기 동안 body overflow를 잠그고 기존 값을 복원한다.

```ts
useEffect(() => {
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  window.requestAnimationFrame(() => closeButtonRef.current?.focus());

  return () => {
    document.body.style.overflow = previousOverflow;
  };
}, [page.slug]);
```

`eventDetailOperations`, `eventDetailContext`, `eventDetailRelated`, `eventDangerArea`의 모바일 조건과 `eventDetailMobileNote`를 제거하여 모바일에도 동일한 기능을 렌더링한다.

- [ ] **Step 5: 목록 버튼의 대화상자 의미 보완**

데스크톱과 모바일 선택 버튼에 다음 속성을 추가한다.

```tsx
aria-haspopup="dialog"
aria-expanded={isSelected}
aria-controls="admin-event-detail"
```

- [ ] **Step 6: 중앙 팝업 CSS 구현**

기존 `.eventWorkspaceContent:has(.eventDetailPanel)` 2열 전환과 데스크톱 border-left 패널 규칙, 767px 이하 하단 시트 규칙을 제거한다. 다음 구조를 관리자 토큰으로 구현한다.

```css
.eventDetailBackdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.46);
}

.eventDetailPanel {
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid var(--admin-color-border-strong);
  border-radius: 8px;
  background: var(--admin-color-surface);
}

@media (max-width: 767px) {
  .eventDetailBackdrop {
    padding: 12px;
  }

  .eventDetailPanel {
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
    padding: 18px;
  }

  .eventDetailMeta div,
  .eventDetailContext p {
    grid-template-columns: 1fr;
  }
}
```

팝업에는 box-shadow를 추가하지 않는다. 긴 이름·slug는 기존 `overflow-wrap: anywhere`를 유지한다.

- [ ] **Step 7: 팝업 계약 통과 확인 및 core 등록**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-event-detail-dialog-contract.mts`

Expected: `admin event detail dialog contract checks passed` 출력과 exit 0.

`scripts/run-test-suite.mjs` core 배열에 `'test-admin-event-detail-dialog-contract'`를 추가한다.

- [ ] **Step 8: 기존 이벤트 모델 회귀 검증**

Run: `npm test -- test-admin-event-workspace-model`

Expected: query, capability, pagination, Escape key 정책 테스트 PASS.

---

### Task 3: 관련 관리 데이터 연결 회귀 점검

**Files:**
- Modify: `scripts/test-admin-event-detail-dialog-contract.mts`
- Modify only if a failing contract proves necessary:
  - `src/app/admin/AdminPageClient.tsx`
  - `src/components/admin/ImageManager/ImageManager.tsx`
  - `src/components/admin/MemoryPageManager/MemoryPageManager.tsx`
  - `src/components/admin/DisplayPeriodManager/DisplayPeriodManager.tsx`
  - `src/app/admin/_components/AdminCommentsTab.tsx`
  - `src/app/admin/_components/AdminCustomerAccountsTab.tsx`

**Interfaces:**
- Consumes: URL `event=<slug>`, 방명록 `commentPageSlug=<slug>`, `initialPageSlug?: string`
- Produces: 팝업에서 선택한 이벤트가 각 관련 관리 화면의 초기 선택·필터로 전달되는 기존 동작의 검증 증거

- [ ] **Step 1: 관련 관리 연결 정적 계약 추가**

`scripts/test-admin-event-detail-dialog-contract.mts`에 다음 검증을 추가한다.

```ts
const client = fs.readFileSync('src/app/admin/AdminPageClient.tsx', 'utf8');
const detailModel = fs.readFileSync(
  'src/app/admin/_components/adminEventWorkspaceModel.ts',
  'utf8'
);

assert.match(client, /MemoryPageManager initialPageSlug=\{selectedEventSlug \?\? undefined\}/);
assert.match(client, /ImageManager[\s\S]*initialPageSlug=\{selectedEventSlug \?\? undefined\}/);
assert.match(client, /DisplayPeriodManager[\s\S]*initialPageSlug=\{selectedEventSlug \?\? undefined\}/);
assert.match(client, /selectedEventSlug=\{selectedEventSlug\}/);
assert.match(detailModel, /commentPageSlug:\s*page\.slug/);
```

- [ ] **Step 2: 연결 계약 실행**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-event-detail-dialog-contract.mts`

Expected: 현재 연결이 이미 구현되어 있으면 PASS. 실패한 항목만 해당 관리자 컴포넌트의 기존 prop 패턴에 맞춰 최소 수정한다.

- [ ] **Step 3: query 모델 테스트 실행**

Run: `npm test -- test-admin-event-workspace-model`

Expected: `getAdminEventRelatedQuery`가 방명록에 `event`, `commentPageSlug`, `pageType`을 반환하고 다른 관리 화면도 `event`를 유지하며 PASS.

- [ ] **Step 4: 고객 연결 필터 회귀 검증**

Run: `npm test -- test-admin-customer-account-assignment-filters`

Expected: 모든 이벤트 유형의 연결 후보와 선택 필터 테스트 PASS.

---

### Task 4: 통합 검증과 브라우저 QA

**Files:**
- Modify only if verification exposes a scoped defect: files changed in Tasks 1-3

**Interfaces:**
- Consumes: Tasks 1-3의 관리자 요약과 팝업 구현
- Produces: 자동 검증과 인증된 데스크톱·모바일 브라우저 증거

- [ ] **Step 1: 새 관리자 테스트 실행**

Run: `npm test -- test-admin-invitation-summary`

Expected: PASS.

Run: `npm test -- test-admin-event-detail-dialog-contract`

Expected: PASS.

- [ ] **Step 2: 웹 타입체크와 린트 실행**

Run: `npm run typecheck:web`

Expected: exit 0.

Run: `npm run lint:web`

Expected: 새 오류와 경고 없이 exit 0. 기존 오류가 있다면 변경 파일 관련 여부를 구분해 기록한다.

- [ ] **Step 3: 프로덕션 빌드 실행**

Run: `npm run build`

Expected: Next.js production build 완료. 이 명령은 재생성 가능한 `.next`만 기존 스크립트로 정리한다.

- [ ] **Step 4: Impeccable detector 최종 1회 실행**

Run: `node C:\Users\박도영\.agents\skills\impeccable\scripts\detect.mjs --json src\app\admin\_components\AdminEventWorkspace.tsx src\app\admin\_components\AdminEventDetailPanel.tsx src\app\admin\_components\AdminEventList.tsx src\app\admin\_components\AdminEventMobileList.tsx src\app\admin\page.module.css`

Expected: exit 0과 빈 findings, 또는 모든 finding을 검토해 요청 범위의 실제 결함만 한 번에 수정한다.

- [ ] **Step 5: 데스크톱 브라우저 QA**

인증된 `/admin/?section=events&tab=pages`를 데스크톱 크기에서 확인한다.

1. 이벤트 선택 전후 목록의 폭과 열이 변하지 않는다.
2. 팝업이 화면 중앙에 열리고 배경이 비활성화된다.
3. 행사일·장소가 샘플과 저장 데이터에 맞게 표시된다.
4. 닫기, 배경 클릭, `Escape`, `Tab` 순환, 닫은 뒤 행 포커스 복원이 동작한다.
5. 편집·미리보기·공개 상태·상품·테마·관련 관리·위험 작업이 기존 정책대로 보인다.

- [ ] **Step 6: 모바일 브라우저 QA**

같은 인증 화면을 `390×844`에서 확인한다.

1. 팝업이 하단에 붙지 않고 화면 사방 여백 안의 중앙 팝업으로 열린다.
2. 팝업 본문만 스크롤되고 배경 페이지는 스크롤되지 않는다.
3. 운영 설정·관련 관리·위험 작업이 숨겨지지 않는다.
4. 긴 이름과 slug가 가로 스크롤을 만들지 않는다.
5. 터치 대상이 최소 44px 높이를 유지한다.

- [ ] **Step 7: 발견된 문제를 한 번에 수정하고 최종 확인**

데스크톱·모바일 첫 QA에서 확인된 결함을 한 묶음으로 수정한다. 수정 뒤 새 관리자 테스트, `typecheck:web`, 관련 화면을 한 번만 다시 확인하고 추가 미세 조정은 중단한다.

- [ ] **Step 8: 변경 범위 확인**

Run: `git diff --check`

Expected: 공백 오류 없음.

Run: `git status --short`

Expected: 사용자 기존 변경인 `src/app/page.tsx`, `src/app/page.module.css`, 승인된 설계·계획 문서와 관리자 범위 파일만 표시된다.
