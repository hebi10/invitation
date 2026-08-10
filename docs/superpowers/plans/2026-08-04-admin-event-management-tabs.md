# Admin Event Management Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선택 이벤트의 노출 기간, 고객 연결, 추억 페이지, 이미지, 방명록을 관리자 상세 팝업 탭에서 관리하고 전체 관리 화면으로도 이동할 수 있게 한다.

**Architecture:** `adminEventWorkspaceModel`이 탭과 query 구성을 정의하고 `AdminEventDetailPanel`이 탭 셸을 담당한다. 이벤트 단위 노출 기간·고객 연결·방명록은 작은 전용 컴포넌트로 분리하고, 추억·이미지는 기존 관리자를 slug 잠금 모드로 재사용한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, TanStack Query, CSS Modules, Firebase-backed services

## Global Constraints

- 레거시 평문 고객 페이지 비밀번호를 복구하지 않는다.
- 기존 관리자 인증·인가와 서비스 API를 재사용한다.
- 이벤트가 지원하지 않는 관리 탭은 렌더링하지 않는다.
- 팝업 최대 폭은 1100px, 모바일 바깥 여백은 12px이다.
- 커밋, 푸시, 배포는 수행하지 않는다.

---

### Task 1: 탭 모델과 회귀 테스트

**Files:**
- Modify: `src/app/admin/_components/adminEventWorkspaceModel.ts`
- Modify: `scripts/test-admin-event-workspace-model.mts`

**Interfaces:**
- Produces: `AdminEventDetailTabKey`, `getAdminEventDetailTabs(page)`, 기존 `getAdminEventRelatedQuery(page, capability)`

- [ ] 지원 기능에 맞는 탭 순서와 query를 검증하는 실패 테스트를 작성한다.
- [ ] `node --import tsx scripts/test-admin-event-workspace-model.mts`로 실패를 확인한다.
- [ ] 탭 모델을 최소 구현한다.
- [ ] 같은 테스트를 다시 실행해 통과를 확인한다.

### Task 2: 이벤트 단위 빠른 관리 컴포넌트

**Files:**
- Create: `src/app/admin/_components/AdminEventPeriodTab.tsx`
- Create: `src/app/admin/_components/AdminEventCustomerTab.tsx`
- Create: `src/app/admin/_components/AdminEventCommentsTab.tsx`
- Modify: `src/app/admin/page.module.css`

**Interfaces:**
- `AdminEventPeriodTab` consumes `page`, `onUpdated` and uses `getAllDisplayPeriods`, `setDisplayPeriod`, `deleteDisplayPeriod`.
- `AdminEventCustomerTab` consumes accounts, loading state, ownership callbacks, and selected page.
- `AdminEventCommentsTab` consumes selected-page comments, loading state, refresh and delete callbacks.

- [ ] 각 컴포넌트가 선택 이벤트만 대상으로 하는 소스 계약 테스트를 추가한다.
- [ ] 테스트 실패를 확인한다.
- [ ] 노출 기간 검증·저장·해제 UI를 구현한다.
- [ ] 고객 연결 상태·계정 선택·초대 링크·연결 해제를 구현한다.
- [ ] 방명록 조회·새로고침·삭제 UI를 구현한다.
- [ ] 관련 테스트를 통과시킨다.

### Task 3: 기존 추억·이미지 관리자의 이벤트 잠금 모드

**Files:**
- Modify: `src/components/admin/MemoryPageManager/MemoryPageManager.tsx`
- Modify: `src/components/admin/ImageManager/ImageManager.tsx`

**Interfaces:**
- Adds optional `lockedPageSlug?: string` to both managers.

- [ ] 잠금 slug가 페이지 선택 목록과 관리 대상에 적용되는 실패 테스트를 작성한다.
- [ ] 테스트 실패를 확인한다.
- [ ] 잠금 모드에서 선택 이벤트만 노출하고 선택기를 숨긴다.
- [ ] 기존 전체 관리 화면 동작이 유지되는지 테스트한다.

### Task 4: 상세 팝업 탭 셸과 데이터 연결

**Files:**
- Modify: `src/app/admin/_components/AdminEventDetailPanel.tsx`
- Modify: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `src/app/admin/_hooks/useAdminData.ts`
- Modify: `src/app/admin/page.module.css`

**Interfaces:**
- `useAdminData` receives `selectedEventSlug?: string | null` and loads comments/accounts while the detail popup is open.
- `AdminEventWorkspace` forwards data and mutations to `AdminEventDetailPanel`.

- [ ] 팝업 탭과 lazy panel 렌더링 계약 테스트를 작성한다.
- [ ] 테스트 실패를 확인한다.
- [ ] 탭 셸, 전체 관리 링크, 최대 1100px 확장 스타일을 구현한다.
- [ ] 댓글·고객 데이터 및 기존 mutation을 연결한다.
- [ ] Escape·포커스 트랩·닫기 복원 회귀 테스트를 통과시킨다.

### Task 5: 최종 검증

**Files:**
- Verify all modified files

- [ ] `git diff --check`를 실행한다.
- [ ] `npm run typecheck:web`을 실행한다.
- [ ] `npm run lint:web`을 실행한다.
- [ ] `npm test`를 실행한다.
- [ ] 데스크톱과 모바일에서 팝업 탭, 가로 넘침, 전체 관리 이동을 확인한다.
