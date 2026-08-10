# 고객 편집·관리자 웜 그래파이트 UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고객 인증·대시보드·이벤트 생성·페이지 편집기와 관리자 화면을 웜 그래파이트 기반의 일관된 작업 UI로 개선한다.

**Architecture:** 작업 화면에만 적용되는 `[data-operation-ui]` 의미 토큰을 별도 CSS에 정의하고 고객 편집기와 관리자 래퍼에서 공유한다. 각 화면의 기존 CSS 변수는 공통 토큰으로 매핑해 컴포넌트 구조와 데이터 흐름은 보존하며, 고객 편집기는 중복 안내를 줄이고 관리자는 최대 폭과 밀도를 정리한다.

**Tech Stack:** Next.js 15 App Router, React 19, CSS Modules, TypeScript, 기존 Node 기반 테스트 스크립트

## Global Constraints

- 공개 초대장과 이벤트별 공개 테마의 색상은 변경하지 않는다.
- 저장·검증·권한·라우팅·데이터 구조를 변경하지 않는다.
- 작업 UI 캔버스는 `#F6F6F3`, 주요 동작은 `#292B27`, 주요 글자는 `#1C1D1A`를 사용한다.
- 버튼과 입력은 6px, 대화상자와 주요 패널은 8px 반경을 기준으로 한다.
- 정적인 카드에 그림자를 추가하지 않는다.
- 관리자 전체 셸의 데스크톱 최대 폭은 `1100px`다.
- 고객 계정 화면의 영문 장식 문구, 알약형 요약 배지, 반복 카드 장식을 제거한다.
- 커밋·푸시·배포는 수행하지 않는다.

---

### Task 1: 공통 작업 UI 의미 토큰

**Files:**
- Create: `src/app/operation-theme.css`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/page-wizard/layout.tsx`
- Modify: `src/app/page-wizard/PageWizardWorkspace.tsx`

**Interfaces:**
- Produces: `[data-operation-ui]`에 노출되는 `--operation-color-*`, `--operation-radius-*`, `--operation-shadow-*` CSS 변수
- Consumes: 관리자 `[data-admin-ui]` 래퍼와 고객 편집기 `.workspace` 래퍼

- [ ] **Step 1: 현재 화면의 계산된 토큰을 기준값으로 확인**

브라우저에서 고객 편집기와 관리자 화면의 주요 버튼 배경이 현재 파란색인지 확인한다. 고객 편집기는 `#315efb`, 관리자는 `#2563eb`가 기준 실패 상태다.

- [ ] **Step 2: 작업 UI 전용 의미 토큰 작성**

```css
[data-operation-ui] {
  --operation-color-canvas: #f6f6f3;
  --operation-color-surface: #ffffff;
  --operation-color-text: #1c1d1a;
  --operation-color-text-secondary: #666862;
  --operation-color-text-muted: #858780;
  --operation-color-border: #d8dad4;
  --operation-color-border-strong: #c4c7bf;
  --operation-color-action: #292b27;
  --operation-color-action-strong: #111210;
  --operation-color-selection: #eeefea;
  --operation-color-focus: #596257;
  --operation-color-success: #3f7054;
  --operation-color-warning: #8a6428;
  --operation-color-danger: #a5423a;
  --operation-radius-control: 6px;
  --operation-radius-panel: 8px;
  --operation-shadow-static: none;
}
```

- [ ] **Step 3: 두 레이아웃에 토큰 범위 연결**

관리자 래퍼에는 `data-operation-ui`를 추가하고, 페이지 위저드 레이아웃에서는 공통 CSS를 불러온다. `PageWizardWorkspace`의 최상위 요소에도 `data-operation-ui`를 추가해 공개 초대장에는 토큰이 상속되지 않게 한다.

- [ ] **Step 4: 타입 검사**

Run: `npm run typecheck:web`

Expected: exit 0

### Task 2: 고객 편집 화면 위계와 컬러 정리

**Files:**
- Modify: `src/app/page-wizard/PageWizardWorkspace.tsx`
- Modify: `src/app/page-wizard/PageWizardWorkspace.module.css`
- Modify: `src/app/page-wizard/pageWizardEditorPanels.module.css`
- Modify: `src/app/page-wizard/page.module.css`
- Modify: `src/app/page-wizard/page.tsx`
- Modify: `src/app/birthday-wizard/page.tsx`
- Modify: `src/app/first-birthday-wizard/page.tsx`
- Modify: `src/app/general-event-wizard/page.tsx`
- Modify: `src/app/opening-wizard/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `--operation-color-*` 토큰
- Preserves: `PageWizardWorkspaceProps`, 단계 이동, 저장 상태, 미리보기, 검증 메시지

- [ ] **Step 1: 현재 모바일 중복 정보 재현**

390px 화면에서 `1 / N`이 모바일 진행 영역과 섹션 헤더에 두 번 표시되고, 오류가 없을 때 `현재 입력 중인 항목입니다`가 노출되는 것을 확인한다.

- [ ] **Step 2: 중복 안내 제거**

`PageWizardWorkspace.tsx`에서 정상 상태의 `activeStepHint` 렌더링을 제거하고 검증 오류만 유지한다. 모바일에서는 `.sectionPosition`을 숨겨 진행 정보가 `.mobileProgress` 한 곳에만 나타나게 한다.

- [ ] **Step 3: 워크스페이스 변수 매핑**

```css
.workspace {
  --workspace-accent: var(--operation-color-action);
  --workspace-accent-strong: var(--operation-color-action-strong);
  --workspace-ink: var(--operation-color-text);
  --workspace-muted: var(--operation-color-text-secondary);
  --workspace-subtle: var(--operation-color-text-muted);
  --workspace-line: var(--operation-color-border);
  --workspace-line-strong: var(--operation-color-border-strong);
  --workspace-surface: var(--operation-color-surface);
  --workspace-canvas: var(--operation-color-canvas);
}
```

주요 버튼, 선택 상태, 포커스 링은 차콜·웜 그레이 토큰으로 바꾸고 컨트롤 6px, 패널 8px 반경을 적용한다.

- [ ] **Step 4: 모든 이벤트 편집 패널의 파란 상태 제거**

`pageWizardEditorPanels.module.css`의 clean workspace override와 `page.module.css`의 clean workspace form system에서 파란 테두리·배경·링크·포커스 색을 공통 토큰으로 바꾼다. 이벤트별 공개 테마 색상 선택 미리보기는 변경하지 않는다.

각 생성 라우트의 Suspense fallback 배경도 `#F6F6F3`으로 통일해 로딩 중 기존 이벤트별 그라디언트가 순간적으로 노출되지 않게 한다.

- [ ] **Step 5: 관련 테스트 실행**

Run: `npm test -- test-page-wizard-workspace`

Expected: `page wizard workspace mapping checks passed`

### Task 3: 관리자 컬러·폭·표면 정리

**Files:**
- Modify: `src/app/admin/admin-theme.css`
- Modify: `src/app/admin/page.module.css`
- Modify: `src/app/admin/_components/AdminUi.module.css`

**Interfaces:**
- Consumes: Task 1의 `--operation-color-*`, `--operation-radius-*` 토큰
- Preserves: 관리자 탐색, 필터, 테이블, 상태 변경, 중앙 상세 팝업 동작

- [ ] **Step 1: 관리자 테마 변수 매핑**

`--admin-color-*`를 공통 작업 UI 토큰에 매핑한다. 성공·경고·오류의 soft 배경은 각 상태색의 저채도 밝은 표면으로 유지하고 텍스트 라벨을 보존한다.

- [ ] **Step 2: 컨트롤과 표면 평면화**

관리자 반경 변수를 6px·8px로 낮추고 `--admin-shadow-sm`, `--admin-shadow-md`를 `none`으로 바꾼다. 주요 버튼의 기존 파란 그림자를 제거하고 포커스는 `--operation-color-focus`를 사용한다.

- [ ] **Step 3: 관리자 최대 폭 제한**

```css
.adminShell {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}
```

이벤트 상세 팝업의 반응형 중앙 배치와 `760px` 이하 내부 폭은 유지한다.

- [ ] **Step 4: 관련 테스트 실행**

Run: `npm test -- test-admin-event-workspace-model`

Expected: `admin event workspace model checks passed`

### Task 4: 고객 계정 화면 전체 통일

**Files:**
- Modify: `src/app/my-invitations/layout.tsx`
- Modify: `src/app/my-invitations/MyInvitationsClient.tsx`
- Modify: `src/app/my-invitations/CustomerAuthPageClient.tsx`
- Modify: `src/app/my-invitations/create/CreateInvitationClient.tsx`
- Modify: `src/app/my-invitations/page.module.css`
- Test: `scripts/test-customer-account-ui-contracts.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: Task 1의 `[data-operation-ui]` 의미 토큰
- Preserves: 고객 인증, 이메일 인증, 지갑, 이벤트 생성, 수정, 미리보기, 방명록 관리, 로그아웃 동작

- [ ] **Step 1: 고객 계정 UI 계약 실패 테스트 작성**

고객 레이아웃이 `data-operation-ui` 범위를 제공하고, 대시보드·인증·생성 화면에서 `My Invitations`, `Create Invitation`, `Email Verification`, `Customer Login`, `Create Account` 장식 문구가 렌더링되지 않는 계약을 추가한다. 기존 파일 기준으로 테스트가 실패하는지 확인한다.

Run: `node scripts/run-test-suite.mjs test-customer-account-ui-contracts`

Expected: FAIL because the operation UI wrapper and simplified Korean hierarchy are missing

- [ ] **Step 2: 공통 작업 UI 범위 연결과 문구 단순화**

`my-invitations/layout.tsx`에서 `operation-theme.css`를 불러오고 최상위 래퍼에 `data-operation-ui`를 추가한다. 인증 화면의 `eyebrow` prop을 제거하고 고객 대시보드·이메일 인증·새 이벤트 생성·미리보기·방명록 팝업의 영문 eyebrow 렌더링을 제거한다. 제목과 실제 한국어 설명은 유지한다.

- [ ] **Step 3: 대시보드 정보 구조 평면화**

상단의 이메일·이벤트 수·제작권·티켓을 알약 배지 대신 2열 정의 목록 형태로 바꾸고, 이벤트 목록은 데스크톱 2열의 단순 행형 패널, 모바일 단일 열로 표시한다. 이벤트 유형은 작은 텍스트 라벨로 유지하며 주소·테마·수정 시각은 한 메타데이터 그룹으로 정리한다.

- [ ] **Step 4: 인증·생성·팝업 표면 통일**

`page.module.css`의 하드코딩 색상을 `--operation-color-*` 토큰으로 교체한다. 컨트롤 6px, 주요 패널과 대화상자 8px 반경, 그림자 없는 표면, 1px 구분선을 적용한다. 모바일 팝업도 중앙 배치를 유지하고 `width: min(720px, calc(100vw - 24px))`, `max-height: calc(100dvh - 24px)` 범위에서 내부 스크롤되게 한다.

- [ ] **Step 5: 고객 계정 UI 계약 테스트 통과 확인**

Run: `node scripts/run-test-suite.mjs test-customer-account-ui-contracts`

Expected: `customer account UI contract checks passed`

### Task 5: 디자인 문서와 통합 검증

**Files:**
- Modify: `DESIGN.md`
- Verify: all changed files

**Interfaces:**
- Produces: 웜 그래파이트 작업 UI를 기준으로 한 최신 디자인 문서

- [ ] **Step 1: 디자인 문서 갱신**

`DESIGN.md`의 파란 행동색 설명을 웜 그래파이트 의미 토큰으로 교체하고, 고객 편집기와 관리자 화면이 같은 시각 체계를 공유하되 공개 초대장 테마는 독립적이라고 명시한다.

- [ ] **Step 2: 디자인 탐지기 실행**

Run: `node C:\Users\박도영\.agents\skills\impeccable\scripts\detect.mjs --json --scope layout src/app/page-wizard/PageWizardWorkspace.module.css src/app/page-wizard/pageWizardEditorPanels.module.css src/app/page-wizard/page.module.css src/app/admin/admin-theme.css src/app/admin/page.module.css src/app/admin/_components/AdminUi.module.css`

Expected: 이번 변경으로 추가된 설명되지 않은 레이아웃·컬러 위반 없음

- [ ] **Step 3: 정적 검증 실행**

Run: `npm run typecheck:web`

Expected: exit 0

Run: `npm run lint:web`

Expected: exit 0

Run: `npm test`

Expected: 전체 비에뮬레이터 테스트 통과

- [ ] **Step 4: 브라우저 검증**

고객 대시보드·로그인·회원가입·새 이벤트 생성·고객 편집기와 관리자 화면을 390px 모바일과 데스크톱에서 한 차례씩 묶어 확인한다. 주요 버튼이 차콜인지, 영문 장식과 알약형 요약이 제거됐는지, 중복 진행 정보가 제거됐는지, 관리자 폭이 1100px 이하인지, 상세 팝업이 중앙에 유지되는지, 가로 스크롤이 없는지 확인한다.

- [ ] **Step 5: 변경 범위 확인**

Run: `git diff --check`

Expected: 공백 오류 없음

사용자 변경과 공개 초대장 테마 파일이 수정되지 않았는지 `git status --short`와 범위별 diff로 확인한다.
