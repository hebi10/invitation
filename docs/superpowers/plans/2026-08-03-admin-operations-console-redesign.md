# 관리자 운영 콘솔 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여러 이벤트 유형을 한 목록에서 빠르게 찾고, 선택한 이벤트의 상태와 주요 작업을 상세 패널에서 처리하는 실용적인 관리자 운영 콘솔을 구축한다.

**Architecture:** 기존 `/admin`의 인증·데이터 훅·mutation은 유지하고, 화면을 공통 셸과 이벤트 워크스페이스로 분리한다. 이벤트 필터링과 유형별 capability는 순수 TypeScript 모델로 만들고, 데스크톱 목록·상세 패널·모바일 카드가 같은 모델을 사용한다. 기존 이미지·추억·방명록·노출 기간 관리 화면은 이벤트 상세에서 선택된 slug를 전달받는 보조 화면으로 유지한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, TanStack Query 5, CSS Modules, Firebase, Node `assert` + `tsx` 검증 스크립트

## Global Constraints

- 공개 이벤트 라우트, API 응답 구조, Firestore schema, Firebase Auth와 `admin-users/{uid}` 권한 검증을 변경하지 않는다.
- 활성 이벤트 유형은 청첩장, 돌잔치, 생일, 일반 행사, 개업이며 기본 목록은 `전체 유형`이다.
- 모바일은 조회, 미리보기, 공개 상태 변경, 편집 화면 이동만 지원한다.
- 이미지, 방명록 대량 운영, 고객 소유권 변경, 이벤트 삭제, 복잡한 노출 기간 편집은 데스크톱 기능으로 유지한다.
- 기존 서비스 함수와 TanStack Query mutation을 재사용하며 새 의존성을 추가하지 않는다.
- 기존 URL은 계속 열려야 한다. `pageCategory`가 있는 기존 링크는 대응하는 `pageType` 필터로 해석한다.
- 큰 소개형 헤더, 요약 카드, 3단 탭, 과도한 pill·그림자·둥근 카드 표현을 새 구조에 사용하지 않는다.
- 상태는 색상만으로 전달하지 않고 비동기 상태는 보조기술에 전달한다.
- 사용자가 요청하지 않았으므로 커밋, 푸시, 배포를 수행하지 않는다.

---

## File Structure

### 새 파일

- `src/app/admin/_components/adminEventWorkspaceModel.ts`: 필터, 정렬, 현황 수치, 이벤트 capability와 관련 화면 query를 계산하는 순수 모델
- `src/app/admin/_components/AdminShell.tsx`: 간결한 공통 헤더와 이벤트·방명록·고객 내비게이션
- `src/app/admin/_components/AdminEventWorkspace.tsx`: 이벤트 화면 상태와 목록·패널·모바일 구성을 조정
- `src/app/admin/_components/AdminEventFilters.tsx`: 검색, 유형, 공개 상태, 연결 상태, 정렬
- `src/app/admin/_components/AdminEventList.tsx`: 데스크톱 표
- `src/app/admin/_components/AdminEventDetailPanel.tsx`: 선택 이벤트의 공통 정보, 주요 작업, 관련 관리 링크, 위험 작업
- `src/app/admin/_components/AdminEventMobileList.tsx`: 모바일 카드와 최소 작업
- `src/app/admin/_components/AdminQueryState.tsx`: 로딩, 오류, 빈 상태 표현
- `scripts/test-admin-event-workspace-model.mts`: 순수 모델 검증
- `scripts/test-admin-operations-console-contract.mts`: 화면 구조·반응형·접근성 계약 검증

### 수정 파일

- `src/app/admin/AdminPageClient.tsx`: URL 상태, 공통 셸, 이벤트 워크스페이스, 방명록·고객 화면 연결
- `src/app/admin/_hooks/useAdminData.ts`: query 오류와 재시도 함수를 화면에 노출
- `src/app/admin/_components/adminPageUtils.ts`: 새 주 내비게이션과 기존 query 호환 파서
- `src/app/admin/_components/index.ts`: 새 컴포넌트 export
- `src/app/admin/_components/Pagination.tsx`: 축약 페이지 번호, 접근 가능한 이전·다음과 현재 페이지
- `src/app/admin/_components/AdminOverlayProvider.tsx`: 닫기 가능한 토스트와 확인창 포커스 복구
- `src/app/admin/_components/AdminOverlayProvider.module.css`: 토스트 닫기 버튼과 포커스 스타일
- `src/app/admin/_components/AdminUi.module.css`: 필터, query 상태, 페이지네이션의 평평한 운영 UI
- `src/app/admin/page.module.css`: 공통 셸, 목록·상세 패널·모바일 카드 반응형
- `src/components/admin/ImageManager/ImageManager.tsx`: 선택 이벤트 slug 초기 필터
- `src/components/admin/MemoryPageManager/MemoryPageManager.tsx`: 선택 이벤트 slug 초기 필터
- `src/components/admin/DisplayPeriodManager/DisplayPeriodManager.tsx`: 선택 이벤트 slug 초기 필터
- `src/app/admin/_components/AdminCommentsTab.tsx`: 전체 방명록과 이벤트별 진입 상태 문구 정리
- `src/app/admin/_components/AdminCustomerAccountsTab.tsx`: 공통 셸 안에서 제목·작업 위계 정리
- `package.json`: 두 관리자 검증 스크립트 등록
- `README.md`: 변경된 관리자 정보 구조 설명

---

### Task 1: 이벤트 워크스페이스 순수 모델

**Files:**
- Create: `src/app/admin/_components/adminEventWorkspaceModel.ts`
- Create: `scripts/test-admin-event-workspace-model.mts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `InvitationPageSummary`, `EventTypeKey`, `listEnabledEventTypes()`, `getEventTypeDisplayLabel()`
- Produces: `AdminEventFilters`, `AdminEventCapabilityKey`, `DEFAULT_ADMIN_EVENT_FILTERS`, filter parser 함수, `filterAdminEvents()`, `getAdminEventCounts()`, `getAdminEventCapabilities()`, `getAdminEventPreviewLinks()`, `getAdminEventRelatedQuery()`

- [ ] **Step 1: 순수 모델의 실패 검증 작성**

```ts
import assert from 'node:assert/strict';

import {
  filterAdminEvents,
  getAdminEventCapabilities,
  getAdminEventCounts,
  getAdminEventPreviewLinks,
  getAdminEventRelatedQuery,
} from '../src/app/admin/_components/adminEventWorkspaceModel.ts';
import type { InvitationPageSummary } from '../src/services/invitationPageService.ts';

function makePage(
  slug: string,
  eventType: InvitationPageSummary['eventType'],
  overrides: Partial<InvitationPageSummary> = {}
): InvitationPageSummary {
  return {
    slug,
    eventType,
    displayName: slug,
    description: '',
    date: '2026-08-10',
    venue: '서울',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-02T00:00:00Z'),
    published: false,
    defaultTheme: eventType === 'birthday' ? 'birthday-minimal' : 'emotional',
    productTier: 'standard',
    features: {
      maxGalleryImages: 10,
      shareMode: 'link',
      showMusic: false,
      showCountdown: true,
      showGuestbook: true,
    },
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
    variants: {},
    dataSource: 'firestore',
    hasCustomConfig: true,
    ownershipKind: 'unassigned',
    ...overrides,
  };
}

const pages = [
  makePage('wedding-one', 'wedding', { displayName: '서준과 지민', published: true }),
  makePage('birthday-one', 'birthday', { displayName: '민서 생일', ownershipKind: 'customer' }),
  makePage('opening-one', 'opening', { displayName: '그린테이블 개업' }),
];

assert.deepEqual(
  filterAdminEvents(pages, {
    query: '민서',
    eventType: 'all',
    published: 'all',
    ownership: 'all',
    sort: 'updated',
  }).map((page) => page.slug),
  ['birthday-one']
);
assert.deepEqual(getAdminEventCounts(pages), {
  total: 3,
  published: 1,
  private: 2,
  unassigned: 2,
});
assert.equal(getAdminEventCapabilities(pages[0]).includes('themes'), true);
assert.equal(getAdminEventCapabilities(pages[1]).includes('themes'), false);
assert.equal(
  getAdminEventPreviewLinks(pages[1])[0]?.path,
  '/birthday-one/birthday-minimal'
);
assert.deepEqual(getAdminEventRelatedQuery(pages[1], 'comments'), {
  section: 'events',
  tab: 'comments',
  event: 'birthday-one',
  commentPageSlug: 'birthday-one',
  pageType: 'birthday',
});

console.log('admin event workspace model checks passed');
```

- [ ] **Step 2: 검증이 모듈 부재로 실패하는지 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-event-workspace-model.mts`

Expected: FAIL with module resolution error for `adminEventWorkspaceModel.ts`.

- [ ] **Step 3: 이벤트 필터·현황·capability 모델 구현**

```ts
import { getEventPreviewLinks } from '@/lib/eventPreviewLinks';
import type { EventTypeKey } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import type { InvitationThemeKey } from '@/types/invitationPage';

export type AdminEventPublishedFilter = 'all' | 'published' | 'private';
export type AdminEventOwnershipFilter =
  | 'all'
  | InvitationPageSummary['ownershipKind'];
export type AdminEventSort = 'updated' | 'event-date' | 'name';
export type AdminEventCapabilityKey =
  | 'edit'
  | 'preview'
  | 'publish'
  | 'themes'
  | 'images'
  | 'memory'
  | 'comments'
  | 'period'
  | 'ownership';

export interface AdminEventFilters {
  query: string;
  eventType: 'all' | EventTypeKey;
  published: AdminEventPublishedFilter;
  ownership: AdminEventOwnershipFilter;
  sort: AdminEventSort;
}

export const DEFAULT_ADMIN_EVENT_FILTERS: AdminEventFilters = {
  query: '',
  eventType: 'all',
  published: 'all',
  ownership: 'all',
  sort: 'updated',
};

export function parseAdminEventPublished(value: string | null) {
  return value === 'published' || value === 'private' ? value : 'all';
}

export function parseAdminEventOwnership(value: string | null) {
  return value === 'customer' || value === 'admin' || value === 'unassigned'
    ? value
    : 'all';
}

export function parseAdminEventSort(value: string | null) {
  return value === 'event-date' || value === 'name' ? value : 'updated';
}

export function filterAdminEvents(
  pages: InvitationPageSummary[],
  filters: AdminEventFilters
) {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');

  return [...pages]
    .filter((page) => {
      const searchable = `${page.displayName} ${page.slug} ${page.description} ${page.venue}`
        .toLocaleLowerCase('ko-KR');
      return (
        (!query || searchable.includes(query)) &&
        (filters.eventType === 'all' || page.eventType === filters.eventType) &&
        (filters.published === 'all' ||
          page.published === (filters.published === 'published')) &&
        (filters.ownership === 'all' || page.ownershipKind === filters.ownership)
      );
    })
    .sort((left, right) => {
      if (filters.sort === 'name') {
        return left.displayName.localeCompare(right.displayName, 'ko');
      }
      if (filters.sort === 'event-date') {
        return left.date.localeCompare(right.date);
      }
      return (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0);
    });
}

export function getAdminEventCounts(pages: InvitationPageSummary[]) {
  return {
    total: pages.length,
    published: pages.filter((page) => page.published).length,
    private: pages.filter((page) => !page.published).length,
    unassigned: pages.filter((page) => page.ownershipKind === 'unassigned').length,
  };
}

export function getAdminEventCapabilities(page: InvitationPageSummary) {
  const capabilities: AdminEventCapabilityKey[] = [
    'edit',
    'preview',
    'publish',
    'period',
    'ownership',
  ];
  if (page.eventType === 'wedding') capabilities.push('themes', 'memory');
  if (page.features.maxGalleryImages > 0) capabilities.push('images');
  if (page.features.showGuestbook) capabilities.push('comments');
  return capabilities;
}

export function getAdminEventPreviewLinks(page: InvitationPageSummary) {
  const availableThemes = Object.entries(page.variants ?? {})
    .filter(([, variant]) => variant?.available)
    .map(([theme]) => theme as InvitationThemeKey);

  return getEventPreviewLinks({
    slug: page.slug,
    eventType: page.eventType,
    availableThemes,
    defaultTheme: page.defaultTheme,
    labelMode: 'admin',
  });
}

export function getAdminEventRelatedQuery(
  page: InvitationPageSummary,
  capability: Extract<
    AdminEventCapabilityKey,
    'images' | 'memory' | 'comments' | 'period' | 'ownership'
  >
): Record<string, string> {
  const base = { event: page.slug, pageType: page.eventType };
  if (capability === 'ownership') {
    return { section: 'customers', tab: 'accounts', ...base };
  }
  if (capability === 'comments') {
    return {
      section: 'events',
      tab: 'comments',
      ...base,
      commentPageSlug: page.slug,
    };
  }
  const tab = capability === 'period' ? 'periods' : capability;
  return { section: 'events', tab, ...base };
}
```

`getAdminEventRelatedQuery()`는 기존 `section`·`tab` query를 그대로 사용하면서 항상 선택 이벤트와 유형을 포함한다.

- [ ] **Step 4: package script 등록 후 모델 검증 통과 확인**

```json
"test:admin-event-workspace-model": "npx --yes tsx --conditions react-server scripts/test-admin-event-workspace-model.mts"
```

Run: `npm run test:admin-event-workspace-model`

Expected: `admin event workspace model checks passed`.

---

### Task 2: URL 호환과 관리자 데이터 오류 상태

**Files:**
- Modify: `src/app/admin/_components/adminPageUtils.ts`
- Modify: `src/app/admin/_hooks/useAdminData.ts`
- Modify: `scripts/test-admin-event-workspace-model.mts`

**Interfaces:**
- Consumes: `PageCategoryTabKey`, TanStack Query result objects
- Produces: `AdminPrimaryView`, `parseAdminPrimaryView()`, `resolveLegacyEventTypeFilter()`, `pagesError`, `retryPages`, `commentsError`, `retryComments`, `accountsError`, `retryAccounts`

- [ ] **Step 1: 기존 링크 호환과 query 오류 계약 검증 추가**

```ts
import {
  parseAdminPrimaryView,
  resolveLegacyEventTypeFilter,
} from '../src/app/admin/_components/adminPageUtils.ts';

assert.equal(parseAdminPrimaryView('pages'), 'events');
assert.equal(parseAdminPrimaryView('comments'), 'comments');
assert.equal(parseAdminPrimaryView('accounts'), 'customers');
assert.equal(resolveLegacyEventTypeFilter(null, null), 'all');
assert.equal(resolveLegacyEventTypeFilter(null, 'first-birthday'), 'first-birthday');
assert.equal(resolveLegacyEventTypeFilter('opening', 'invitation'), 'opening');
```

별도 source contract에서는 `useAdminData.ts`가 `pagesQuery.error`, `pagesQuery.refetch`, `commentsQuery.error`, `accountsQuery.error`를 반환 객체에 연결하는지 검사한다.

- [ ] **Step 2: 검증이 새 export 부재로 실패하는지 확인**

Run: `npm run test:admin-event-workspace-model`

Expected: FAIL because `parseAdminPrimaryView` and `resolveLegacyEventTypeFilter` are not exported.

- [ ] **Step 3: URL 호환 파서 구현**

```ts
export type AdminPrimaryView = 'events' | 'comments' | 'customers';

export function parseAdminPrimaryView(tab: AdminTab): AdminPrimaryView {
  if (tab === 'comments') return 'comments';
  if (tab === 'accounts') return 'customers';
  return 'events';
}

export function resolveLegacyEventTypeFilter(
  pageType: string | null,
  pageCategory: string | null
): PageEventTypeFilter {
  const parsedPageType = parsePageEventType(pageType);
  if (parsedPageType !== 'all') return parsedPageType;
  if (!pageCategory) return 'all';
  return getPageCategoryEventTypeFilter(parsePageCategory(pageCategory)) ?? 'all';
}
```

- [ ] **Step 4: query 오류와 재시도 함수 노출**

```ts
const pagesError = pagesQuery.error instanceof Error ? pagesQuery.error : null;
const commentsError = commentsQuery.error instanceof Error ? commentsQuery.error : null;
const accountsError = accountsQuery.error instanceof Error ? accountsQuery.error : null;

const retryPages = useCallback(async () => {
  await pagesQuery.refetch();
}, [pagesQuery]);
const retryComments = useCallback(async () => {
  await commentsQuery.refetch();
}, [commentsQuery]);
const retryAccounts = useCallback(async () => {
  await accountsQuery.refetch();
}, [accountsQuery]);
```

반환 객체에 위 오류와 재시도 함수를 추가한다. 기존 `pages = data ?? []`는 캐시 데이터를 유지하므로 변경하지 않는다.

- [ ] **Step 5: 모델 검증과 타입체크 통과 확인**

Run: `npm run test:admin-event-workspace-model`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

---

### Task 3: 간결한 관리자 셸과 주 내비게이션

**Files:**
- Create: `src/app/admin/_components/AdminShell.tsx`
- Modify: `src/app/admin/_components/index.ts`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `src/app/admin/page.module.css`
- Create: `scripts/test-admin-operations-console-contract.mts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `AdminPrimaryView`, 관리자 email, `onNavigate()`, `onLogout()`
- Produces: 큰 소개 영역과 요약 카드 없이 이벤트·방명록·고객을 전환하는 `AdminShell`

- [ ] **Step 1: 셸 계약 검증 작성**

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync('src/app/admin/AdminPageClient.tsx', 'utf8');
const shell = readFileSync('src/app/admin/_components/AdminShell.tsx', 'utf8');

assert.match(shell, /이벤트/);
assert.match(shell, /방명록/);
assert.match(shell, /고객/);
assert.match(shell, /aria-current=\{activeView === item\.key \? 'page' : undefined\}/);
assert.doesNotMatch(client, /<SummaryCards/);
assert.doesNotMatch(client, /Invitation Admin/);

console.log('admin operations console contract checks passed');
```

- [ ] **Step 2: 셸 파일 부재로 검증 실패 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-operations-console-contract.mts`

Expected: FAIL reading `AdminShell.tsx`.

- [ ] **Step 3: AdminShell 구현**

```tsx
import type { AdminPrimaryView } from './adminPageUtils';
import styles from '../page.module.css';

interface AdminShellProps {
  activeView: AdminPrimaryView;
  adminEmail: string;
  onNavigate: (view: AdminPrimaryView) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const ITEMS: Array<{ key: AdminPrimaryView; label: string }> = [
  { key: 'events', label: '이벤트' },
  { key: 'comments', label: '방명록' },
  { key: 'customers', label: '고객' },
];

export default function AdminShell(props: AdminShellProps) {
  return (
    <div className={styles.adminShell}>
      <header className={styles.adminTopbar}>
        <a href="/admin" className={styles.adminBrand}>운영 관리</a>
        <nav aria-label="관리 업무" className={styles.adminPrimaryNav}>
          {ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={props.activeView === item.key ? 'page' : undefined}
              className={styles.adminPrimaryNavItem}
              onClick={() => props.onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.adminAccountMenu}>
          <span>{props.adminEmail}</span>
          <button type="button" onClick={props.onLogout}>로그아웃</button>
        </div>
      </header>
      <main className={styles.adminMain}>{props.children}</main>
    </div>
  );
}
```

- [ ] **Step 4: AdminPageClient에 셸 연결**

`SummaryCards`, 세 겹의 `.tabStack`, `.pageHeader`를 렌더링 경로에서 제거한다. `parseAdminPrimaryView(activeTab)`으로 활성 영역을 계산하고 주 내비게이션은 다음 query를 사용한다.

```ts
const PRIMARY_VIEW_QUERY = {
  events: { section: 'events', tab: 'pages' },
  comments: { section: 'events', tab: 'comments' },
  customers: { section: 'customers', tab: 'accounts' },
} as const;
```

기존 `memory`, `images`, `periods` query는 상세 패널에서 직접 열 수 있도록 렌더링 분기를 유지한다.

- [ ] **Step 5: 평평한 셸 스타일 구현 후 계약 검증**

`page.module.css`의 새 셸에는 큰 카드 외곽, gradient, box-shadow를 사용하지 않는다. 구분선과 여백으로 상단 바, 내비게이션, 본문을 나눈다.

Run: `npm run test:admin-operations-console`

Expected: PASS after adding:

```json
"test:admin-operations-console": "npx --yes tsx --conditions react-server scripts/test-admin-operations-console-contract.mts"
```

---

### Task 4: 검색 중심 이벤트 목록과 필터

**Files:**
- Create: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Create: `src/app/admin/_components/AdminEventFilters.tsx`
- Create: `src/app/admin/_components/AdminEventList.tsx`
- Modify: `src/app/admin/_components/index.ts`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `src/app/admin/page.module.css`
- Modify: `scripts/test-admin-operations-console-contract.mts`

**Interfaces:**
- Consumes: `InvitationPageSummary[]`, `AdminEventFilters`, `filterAdminEvents()`, `getAdminEventCounts()`, URL query updater
- Produces: 첫 화면에 검색·현황·필터·목록이 바로 보이는 `AdminEventWorkspace`

- [ ] **Step 1: 이벤트 목록 구조 계약 추가**

```ts
const workspace = readFileSync(
  'src/app/admin/_components/AdminEventWorkspace.tsx',
  'utf8'
);
const list = readFileSync('src/app/admin/_components/AdminEventList.tsx', 'utf8');

assert.match(workspace, /이벤트 관리/);
assert.match(workspace, /전체 \{counts\.total\}/);
assert.match(list, /이벤트/);
assert.match(list, /행사일/);
assert.match(list, /공개 상태/);
assert.match(list, /고객 연결/);
assert.match(list, /최근 수정/);
assert.doesNotMatch(list, /서비스 등급/);
assert.doesNotMatch(list, /완전 삭제/);
```

- [ ] **Step 2: 새 컴포넌트 부재로 계약 검증 실패 확인**

Run: `npm run test:admin-operations-console`

Expected: FAIL reading the new workspace files.

- [ ] **Step 3: AdminEventFilters 구현**

`pageQ`, `pageType`, `published`, `ownership`, `pageSort` query를 사용한다. 유형 옵션은 `listEnabledEventTypes()`로 생성하고 라벨은 `getEventTypeDisplayLabel(type, 'admin')`을 사용한다. 검색 placeholder는 `이벤트명 또는 공개 주소 검색`으로 고정한다.

```tsx
<label className="admin-field">
  <span className="admin-field-label">검색</span>
  <input
    className="admin-input"
    type="search"
    value={filters.query}
    placeholder="이벤트명 또는 공개 주소 검색"
    onChange={(event) => onChange({ pageQ: event.currentTarget.value || null })}
  />
</label>
```

항상 보이는 선택지는 유형, 공개 상태, 고객 연결, 정렬 네 가지로 제한하고 초기화 버튼은 모든 관련 query를 `null`로 만든다.

- [ ] **Step 4: AdminEventList 구현**

행 선택 버튼은 이벤트명을 포함한 첫 셀에 두고 `aria-expanded`와 `aria-controls="admin-event-detail"`을 연결한다. 열은 이벤트, 유형, 행사일, 공개 상태, 고객 연결, 최근 수정, 편집으로 제한한다.

```tsx
<button
  type="button"
  className={styles.eventSelectButton}
  aria-expanded={selectedSlug === page.slug}
  aria-controls="admin-event-detail"
  onClick={() => onSelect(page.slug)}
>
  <strong>{page.displayName}</strong>
  <span>{page.slug}</span>
</button>
```

편집 링크는 `getPageWizardCreateHrefForEventType()`가 아니라 기존 상세 편집 경로 `/page-wizard/${page.slug}`를 사용한다.

- [ ] **Step 5: AdminEventWorkspace에서 현황과 목록 조합**

현황은 카드가 아닌 한 줄 버튼으로 제공한다.

```tsx
<div className={styles.eventCounts} aria-label="이벤트 현황">
  <button type="button" onClick={() => onQueryChange({ published: null })}>
    전체 {counts.total}
  </button>
  <button type="button" onClick={() => onQueryChange({ published: 'published' })}>
    공개 {counts.published}
  </button>
  <button type="button" onClick={() => onQueryChange({ published: 'private' })}>
    비공개 {counts.private}
  </button>
  <button type="button" onClick={() => onQueryChange({ ownership: 'unassigned' })}>
    고객 미연결 {counts.unassigned}
  </button>
</div>
```

- [ ] **Step 6: AdminPageClient에서 기존 AdminPagesTab을 새 워크스페이스로 교체**

기존 `pageCategory`가 URL에 명시된 경우에만 `resolveLegacyEventTypeFilter(safeSearchParams.get('pageType'), safeSearchParams.get('pageCategory'))`로 이벤트 유형을 해석한다. 두 query가 모두 없으면 `전체 유형`이다. 이후 `pageType` query를 화면의 기준으로 사용하고 선택 slug는 `event` query에서 읽는다. 공개·연결·정렬 값은 Task 1의 parser 함수로 해석한다.

- [ ] **Step 7: 계약 검증·모델 검증·타입체크**

Run: `npm run test:admin-event-workspace-model`

Expected: PASS.

Run: `npm run test:admin-operations-console`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

---

### Task 5: 이벤트 상세 패널과 유형별 기능

**Files:**
- Create: `src/app/admin/_components/AdminEventDetailPanel.tsx`
- Modify: `src/app/admin/_components/adminEventWorkspaceModel.ts`
- Modify: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Modify: `src/app/admin/_components/index.ts`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `src/app/admin/page.module.css`
- Modify: `scripts/test-admin-event-workspace-model.mts`
- Modify: `scripts/test-admin-operations-console-contract.mts`

**Interfaces:**
- Consumes: 선택 `InvitationPageSummary`, capability 배열, 기존 공개 mutation·테마·소유권·삭제 함수
- Produces: `AdminEventDetailPanel`과 이벤트별 관련 관리 query

- [ ] **Step 1: capability와 패널 접근성 계약 추가**

```ts
assert.match(
  readFileSync('src/app/admin/_components/AdminEventDetailPanel.tsx', 'utf8'),
  /id="admin-event-detail"/
);
assert.match(
  readFileSync('src/app/admin/_components/AdminEventDetailPanel.tsx', 'utf8'),
  /aria-label="이벤트 상세"/
);
assert.match(
  readFileSync('src/app/admin/_components/AdminEventDetailPanel.tsx', 'utf8'),
  /위험 작업/
);
```

모델 검증에는 wedding만 `themes`와 `memory`를 갖고, `showGuestbook=false`면 `comments`가 빠지고, `maxGalleryImages=0`이면 `images`가 빠지는 사례를 추가한다.

- [ ] **Step 2: 새 패널 부재로 검증 실패 확인**

Run: `npm run test:admin-operations-console`

Expected: FAIL reading `AdminEventDetailPanel.tsx`.

- [ ] **Step 3: 상세 패널 구현**

패널 props는 아래로 고정한다.

```ts
interface AdminEventDetailPanelProps {
  page: InvitationPageSummary;
  updatingPublished: boolean;
  deleting: boolean;
  issuingInvite: boolean;
  onClose: () => void;
  onTogglePublished: (page: InvitationPageSummary, next: boolean) => void;
  onOpenRelated: (query: Record<string, string>) => void;
  onIssueOwnershipInvite: (slug: string) => void;
  onDelete: (page: InvitationPageSummary) => void;
}
```

상단에는 유형 라벨, 이벤트명, 일정, 장소, slug를 보여준다. 기본 작업은 `편집`, 보조 작업은 `미리보기`, 상태 작업은 공개 select 하나만 표시한다. 미리보기 URL은 이벤트 타입별 기존 preview helper를 사용한다.

관련 기능은 `getAdminEventCapabilities(page)` 결과에 따라 이미지, 추억, 방명록, 노출 기간, 고객 연결만 렌더링한다. 각 버튼은 `getAdminEventRelatedQuery(page, capability)` 결과를 `onOpenRelated`에 전달한다.

위험 작업은 `<details>`에 넣고 소유권 링크 발급과 삭제를 일상 작업과 분리한다. 모바일에서는 CSS로 이 영역 전체를 숨긴다.

- [ ] **Step 4: URL 선택·닫기·뒤로가기 연결**

행 선택 시 `event=<slug>`를 설정하고 닫기 시 `event`만 제거한다. query의 slug가 현재 목록에 없어도 전체 `pages`에서 찾고, 존재하지 않는 slug면 query를 제거한다. 패널이 닫힐 때 `data-event-slug=<slug>`인 행 선택 버튼으로 포커스를 복구한다.

- [ ] **Step 5: 모델·계약·타입 검증**

Run: `npm run test:admin-event-workspace-model && npm run test:admin-operations-console && npm run typecheck:web`

Expected: all PASS.

---

### Task 6: 모바일 카드와 최소 상세 시트

**Files:**
- Create: `src/app/admin/_components/AdminEventMobileList.tsx`
- Modify: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Modify: `src/app/admin/_components/AdminEventDetailPanel.tsx`
- Modify: `src/app/admin/page.module.css`
- Modify: `scripts/test-admin-operations-console-contract.mts`

**Interfaces:**
- Consumes: 데스크톱과 같은 이벤트 목록·선택·공개 mutation
- Produces: 767px 이하에서 표를 대체하는 카드 목록과 하단 상세 시트

- [ ] **Step 1: 모바일 표시 전환 계약 추가**

```ts
const css = readFileSync('src/app/admin/page.module.css', 'utf8');
const mobileList = readFileSync(
  'src/app/admin/_components/AdminEventMobileList.tsx',
  'utf8'
);

assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.eventTable[\s\S]*display:\s*none/);
assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.eventMobileList[\s\S]*display:\s*grid/);
assert.match(mobileList, /공개 상태/);
assert.match(mobileList, /미리보기/);
assert.match(mobileList, /편집/);
assert.doesNotMatch(mobileList, /완전 삭제/);
assert.doesNotMatch(mobileList, /고객 연결 해제/);
```

- [ ] **Step 2: 모바일 컴포넌트 부재로 계약 검증 실패 확인**

Run: `npm run test:admin-operations-console`

Expected: FAIL reading `AdminEventMobileList.tsx`.

- [ ] **Step 3: 모바일 카드 구현**

각 카드는 이벤트명, 유형, 행사일, 공개 상태, 고객 연결 상태만 표시한다. `상세 보기`가 `event=<slug>`를 설정한다. 카드의 직접 작업은 편집 링크 하나만 둔다.

```tsx
<article className={styles.eventMobileCard}>
  <div>
    <span>{getEventTypeDisplayLabel(page.eventType, 'admin')}</span>
    <h3>{page.displayName}</h3>
    <p>{page.date || '일정 미정'}</p>
  </div>
  <div aria-label="이벤트 상태">
    <span>{page.published ? '공개' : '비공개'}</span>
    <span>{getOwnershipLabel(page.ownershipKind)}</span>
  </div>
  <div>
    <button type="button" onClick={() => onSelect(page.slug)}>상세 보기</button>
    <a href={`/page-wizard/${page.slug}`}>편집</a>
  </div>
</article>
```

- [ ] **Step 4: 모바일 상세 시트 제한**

상세 패널의 모바일 variant에는 닫기, 미리보기, 공개 상태 변경, 편집만 남긴다. 이미지·추억·방명록·기간·소유권·삭제는 렌더링하지 않고 `추가 관리는 PC에서 이용해 주세요.`를 표시한다.

- [ ] **Step 5: CSS 전환과 모바일 계약 검증**

767px 이하에서 `.eventTable`은 숨기고 `.eventMobileList`를 grid로 표시한다. 상세 패널은 화면 하단 sheet로 고정하되 문서 가로 폭을 넘지 않게 한다.

Run: `npm run test:admin-operations-console && npm run typecheck:web`

Expected: PASS.

---

### Task 7: 관련 관리 화면에 선택 이벤트 전달

**Files:**
- Modify: `src/components/admin/ImageManager/ImageManager.tsx`
- Modify: `src/components/admin/MemoryPageManager/MemoryPageManager.tsx`
- Modify: `src/components/admin/DisplayPeriodManager/DisplayPeriodManager.tsx`
- Modify: `src/app/admin/_components/AdminCommentsTab.tsx`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `scripts/test-admin-operations-console-contract.mts`

**Interfaces:**
- Consumes: URL `event=<slug>`, 기존 `commentPageSlug`
- Produces: 각 보조 관리 화면의 `initialPageSlug?: string` 초기 필터

- [ ] **Step 1: 선택 이벤트 전달 계약 추가**

```ts
const imageManager = readFileSync(
  'src/components/admin/ImageManager/ImageManager.tsx',
  'utf8'
);
const memoryManager = readFileSync(
  'src/components/admin/MemoryPageManager/MemoryPageManager.tsx',
  'utf8'
);
const periodManager = readFileSync(
  'src/components/admin/DisplayPeriodManager/DisplayPeriodManager.tsx',
  'utf8'
);

assert.match(imageManager, /initialPageSlug\?: string/);
assert.match(memoryManager, /initialPageSlug\?: string/);
assert.match(periodManager, /initialPageSlug\?: string/);
```

- [ ] **Step 2: 기존 props 상태에서 계약 검증 실패 확인**

Run: `npm run test:admin-operations-console`

Expected: FAIL because managers do not accept `initialPageSlug`.

- [ ] **Step 3: manager별 초기 선택 prop 구현**

각 manager의 props에 `initialPageSlug?: string`을 추가하고, 페이지 목록이 로드된 뒤 해당 slug가 존재하면 기존 내부 선택 state의 초기값으로 사용한다. slug가 없으면 기존 전체 또는 첫 항목 동작을 유지한다. 사용자가 manager 안에서 다른 이벤트를 선택하면 URL `event`를 자동 변경하지 않는다.

```ts
useEffect(() => {
  if (!initialPageSlug) return;
  if (pages.some((page) => page.slug === initialPageSlug)) {
    setSelectedPageSlug(initialPageSlug);
  }
}, [initialPageSlug, pages]);
```

- [ ] **Step 4: AdminPageClient 연결**

`safeSearchParams.get('event') ?? undefined`를 세 manager에 전달한다. 방명록은 `commentPageSlug`가 없고 `event`가 있으면 해당 slug를 선택값으로 사용한다. 방명록 상단에는 `선택한 이벤트만 보는 중`과 전체 방명록으로 돌아가는 버튼을 제공한다.

- [ ] **Step 5: 계약·타입·기존 preview 검증**

Run: `npm run test:admin-operations-console`

Expected: PASS.

Run: `npm run test:admin-event-preview-links`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

---

### Task 8: 오류·페이지네이션·토스트·포커스 접근성

**Files:**
- Create: `src/app/admin/_components/AdminQueryState.tsx`
- Modify: `src/app/admin/_components/index.ts`
- Modify: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Modify: `src/app/admin/_components/Pagination.tsx`
- Modify: `src/app/admin/_components/AdminOverlayProvider.tsx`
- Modify: `src/app/admin/_components/AdminOverlayProvider.module.css`
- Modify: `src/app/admin/_components/AdminUi.module.css`
- Modify: `scripts/test-admin-operations-console-contract.mts`

**Interfaces:**
- Consumes: `loading`, `error`, 데이터 수, `onRetry()`
- Produces: 구분된 로딩·오류·빈 상태, 축약 페이지 번호, 닫기 가능한 토스트, 확인창 포커스 복구

- [ ] **Step 1: 접근성 계약 추가**

```ts
const pagination = readFileSync('src/app/admin/_components/Pagination.tsx', 'utf8');
const overlay = readFileSync(
  'src/app/admin/_components/AdminOverlayProvider.tsx',
  'utf8'
);
const queryState = readFileSync(
  'src/app/admin/_components/AdminQueryState.tsx',
  'utf8'
);

assert.match(pagination, /aria-label="이전 페이지"/);
assert.match(pagination, /aria-label="다음 페이지"/);
assert.match(pagination, /aria-current=\{currentPage === pageNumber \? 'page' : undefined\}/);
assert.match(overlay, /토스트 닫기/);
assert.match(overlay, /previousFocusRef/);
assert.match(queryState, /role="status"/);
assert.match(queryState, /role="alert"/);
assert.match(queryState, /다시 시도/);
```

- [ ] **Step 2: 새 query 상태 파일 부재로 실패 확인**

Run: `npm run test:admin-operations-console`

Expected: FAIL reading `AdminQueryState.tsx`.

- [ ] **Step 3: AdminQueryState 구현**

```tsx
interface AdminQueryStateProps {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
}

export default function AdminQueryState(props: AdminQueryStateProps) {
  if (props.loading) {
    return <div role="status" aria-live="polite">이벤트를 불러오는 중입니다.</div>;
  }
  if (props.error) {
    return (
      <div role="alert">
        <strong>이벤트를 불러오지 못했습니다.</strong>
        <p>{props.error.message || '네트워크 상태를 확인하고 다시 시도해 주세요.'}</p>
        <button type="button" onClick={props.onRetry}>다시 시도</button>
      </div>
    );
  }
  if (props.empty) {
    return <EmptyState title={props.emptyTitle} description={props.emptyDescription} />;
  }
  return null;
}
```

캐시 데이터가 존재하면 오류 배너를 목록 위에 작게 표시하고 목록 자체는 유지한다.

- [ ] **Step 4: 축약 페이지 번호 구현**

페이지 번호는 첫 페이지, 마지막 페이지, 현재 ±2만 반환하는 순수 함수로 만든다. 생략 구간은 비활성 텍스트 `…`로 표시한다. 이전·다음에는 한국어 `aria-label`, 현재 페이지에는 `aria-current="page"`를 제공한다.

- [ ] **Step 5: 토스트 닫기와 확인창 포커스 복구 구현**

`dismissToast(id)`를 추가하고 각 토스트에 `aria-label="토스트 닫기"` 버튼을 제공한다. 자동 종료는 5초로 늘린다. 확인창을 열기 전 `document.activeElement`를 `previousFocusRef`에 저장하고 닫힌 뒤 `.focus()`한다. 위험 확인창의 최초 포커스는 취소 버튼이다.

- [ ] **Step 6: 계약·타입 검증**

Run: `npm run test:admin-operations-console && npm run typecheck:web`

Expected: PASS.

---

### Task 9: 방명록·고객 화면 정리와 통합 검증

**Files:**
- Modify: `src/app/admin/_components/AdminCommentsTab.tsx`
- Modify: `src/app/admin/_components/AdminCustomerAccountsTab.tsx`
- Modify: `src/app/admin/page.module.css`
- Modify: `src/app/admin/_components/AdminUi.module.css`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `README.md`
- Modify: `scripts/test-admin-operations-console-contract.mts`

**Interfaces:**
- Consumes: `AdminShell`, 기존 방명록·고객 데이터와 mutation
- Produces: 같은 제목·필터·상태·작업 위계를 사용하는 세 관리자 업무 영역

- [ ] **Step 1: 공통 위계 계약 추가**

```ts
const comments = readFileSync(
  'src/app/admin/_components/AdminCommentsTab.tsx',
  'utf8'
);
const customers = readFileSync(
  'src/app/admin/_components/AdminCustomerAccountsTab.tsx',
  'utf8'
);

assert.match(comments, /방명록 관리/);
assert.match(customers, /고객 관리/);
assert.doesNotMatch(comments, /sectionDescription/);
assert.doesNotMatch(customers, /summaryGrid/);
```

- [ ] **Step 2: 현재 제목·요약 구조에서 계약 실패 확인**

Run: `npm run test:admin-operations-console`

Expected: FAIL until both tabs use the shared hierarchy.

- [ ] **Step 3: 방명록 화면 정리**

제목, 결과 수, 검색·이벤트·기간 필터, 목록 순서로 재배치한다. 이벤트 상세에서 진입했으면 선택된 이벤트 이름과 `전체 방명록 보기`를 제목 아래 한 줄로 표시한다. 댓글 삭제는 기존 확인·mutation을 유지한다.

- [ ] **Step 4: 고객 화면 정리**

제목, 검색/상태 필터, 고객 목록 순서로 재배치한다. 계정 삭제와 소유권 해제는 각 고객 카드의 접힌 위험 영역에 둔다. 제작권 지급과 이벤트 연결은 기존 로직을 유지하되 기본 작업과 위험 작업을 같은 줄에 배치하지 않는다.

- [ ] **Step 5: README 관리자 구조 갱신**

`/admin` 설명을 이벤트·방명록·고객 세 업무 영역과 이벤트 상세 관련 관리 진입 구조로 수정한다. 기존 권한과 API 설명은 유지한다.

- [ ] **Step 6: 정적·타입·기존 회귀 검증**

Run: `npm run test:admin-event-workspace-model`

Expected: PASS.

Run: `npm run test:admin-operations-console`

Expected: PASS.

Run: `npm run test:admin-event-preview-links`

Expected: PASS.

Run: `npm run test:admin-customer-assignment-filters`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

Run: `npm run lint:web`

Expected: PASS with no new warnings or errors.

- [ ] **Step 7: 프로덕션 빌드 검증**

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 8: Impeccable detector 최종 1회 실행**

Run: `node C:\Users\박도영\.agents\skills\impeccable\scripts\detect.mjs --json src\app\admin`

Expected: exit 0 with `[]`, or every reported finding is reviewed and fixed before browser QA.

- [ ] **Step 9: 인증된 브라우저 QA**

데스크톱 `1440×900`에서 다음을 확인한다.

1. 검색과 이벤트 목록이 첫 화면에 보인다.
2. 전체 유형에 청첩장·돌잔치·생일·일반 행사·개업이 함께 표시된다.
3. 검색·필터·선택 query가 새로고침 후 유지된다.
4. 행 선택 후 상세 패널이 열리고 편집·미리보기·공개 변경이 동작한다.
5. 이미지·추억·방명록·노출 기간 링크가 선택 이벤트를 전달한다.
6. 오류·빈 상태·새로고침 중 상태가 서로 구분된다.
7. 키보드로 검색, 행 선택, 공개 변경, 패널 닫기를 완료하고 포커스가 복귀한다.

모바일 `390×844`에서 다음을 확인한다.

1. 가로 스크롤과 900px 표가 나타나지 않는다.
2. 카드에서 이벤트명, 유형, 일정, 공개·연결 상태를 읽을 수 있다.
3. 상세 시트에는 미리보기·공개 변경·편집만 나타난다.
4. 위험 작업과 데스크톱 전용 기능이 나타나지 않는다.
5. 긴 이름과 slug가 레이아웃을 깨뜨리지 않는다.

인증된 관리자 화면에 접근할 수 없으면 로그인 게이트까지만 확인했다고 명시하고, 위 항목은 미검증 상태로 남긴다.

---

## Final Verification Matrix

| 요구사항 | 검증 위치 |
|---|---|
| 전체 이벤트 유형 목록 | Task 1 모델 테스트, Task 9 브라우저 |
| 검색 중심 첫 화면 | Task 4 contract, Task 9 브라우저 |
| 목록 상태 유지와 상세 패널 | Task 5 URL 흐름, Task 9 브라우저 |
| 유형별 기능만 노출 | Task 1 capability 테스트, Task 5 패널 |
| 모바일 최소 기능 | Task 6 contract, Task 9 모바일 QA |
| 오류와 빈 상태 구분 | Task 2 query 오류, Task 8 query state |
| 위험 작업 분리 | Task 5 상세 패널, Task 9 고객 화면 |
| 접근성 | Task 8 contract, Task 9 키보드 QA |
| API·권한 보존 | 기존 mutation 재사용, typecheck, build, 회귀 테스트 |
| AI스러운 장식 제거 | Task 3 셸, Task 4 목록, detector와 브라우저 QA |
