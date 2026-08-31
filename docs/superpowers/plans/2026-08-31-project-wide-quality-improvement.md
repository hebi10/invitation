# Project-Wide Quality Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배포를 막는 보안·테스트 문제를 해결하고 위저드, 관리자, 공개 청첩장의 핵심 UX와 프로젝트 문서를 실제 동작에 맞게 개선한다.

**Architecture:** 기존 라우트·저장 스키마·권한 경계는 유지하고, 순수 상태 계산과 표시 컴포넌트를 작은 단위로 추출한다. 보안·테스트, 위저드, 관리자, 공개 렌더러는 파일 경계가 겹치지 않으므로 독립 작업으로 진행하고 마지막에 루트 에이전트가 전체 검증과 브라우저 QA를 통합한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Firebase/Firestore/Storage Emulator, Expo SDK 55, Node 기반 계약 테스트

**Spec:** `docs/superpowers/specs/2026-08-31-project-wide-quality-improvement-design.md`

## Global Constraints

- 공개 라우트, Firebase 저장 스키마, 인증·인가 정책을 변경하지 않는다.
- Next.js는 `15.5.24`, `eslint-config-next`는 `15.5.24`, Firebase Client는 `12.18.0`, Firebase Admin은 현재 메이저의 `13.10.0`을 사용한다.
- `sharp`는 보안 수정 버전인 `0.35.4`를 사용하고 `limitInputPixels: 20_000_000`, `failOn: 'truncated'` 정책을 유지한다.
- Expo는 SDK 55를 유지하고 `55.0.30` 호환 패치만 적용한다.
- 새 테마, 새 비즈니스 기능, 운영 데이터 변경, 푸시, 배포는 범위에 포함하지 않는다.
- 행동 변경은 실패하는 테스트를 먼저 확인한 뒤 최소 구현으로 통과시킨다.

---

### Task 1: 깨진 테스트 계약과 에뮬레이터 격리 복구

**Files:**
- Modify: `scripts/test-admin-event-preview-links.mts`
- Modify: `scripts/test-security-hardening.mts`
- Modify: `scripts/test-admin-event-deletion-emulator.mts`
- Modify: `scripts/test-demo-experience-repository-emulator.mts`

**Interfaces:**
- Consumes: `INVITATION_THEME_KEYS`, `adminEventDeletionRepository`의 삭제 전용 경로, Firestore Admin SDK
- Produces: 실행 순서와 무관하게 통과하는 core/security/emulator 테스트 계약

- [ ] **Step 1: 현재 실패를 RED로 재현**

Run:

```powershell
node scripts/run-test-suite.mjs test-admin-event-preview-links
node scripts/run-test-suite.mjs test-security-hardening
npm run test:emulator
```

Expected: GYEOL 기대값 누락, `ownershipInvites` 참조 개수 가정, 잔여 `events` 2개 때문에 각각 실패한다.

- [ ] **Step 2: 테마 계약을 실제 레지스트리와 동기화**

`test-admin-event-preview-links.mts`의 테마 키·메타데이터·미리보기 샘플·판매 정책 기대값에 다음 GYEOL 계약을 추가한다.

```ts
const expectedWeddingThemes = [
  'emotional',
  'romantic',
  'gyeol',
  'simple',
  'classic-r',
];

const gyeolPreview = {
  label: '결',
  path: '/kim-shinlang-na-sinbu/gyeol',
};
```

정확한 라벨과 샘플 slug는 `src/lib/invitationThemes.ts`와 기존 테스트 데이터에서 가져오고 중복 상수를 만들지 않는다.

- [ ] **Step 3: 보안 가드를 허용 목록 기반으로 변경**

문자열 출현 파일 수가 아니라 생성·갱신 경로와 삭제 경로를 구분한다.

```ts
const allowedOwnershipInviteRepositories = new Set([
  'src/server/repositories/eventOwnershipInviteRepository.ts',
  'src/server/repositories/adminEventDeletionRepository.ts',
]);

assert.deepEqual(
  ownershipInviteReferences.sort(),
  [...allowedOwnershipInviteRepositories].sort()
);
```

`eventOwnershipInviteRepository`만 초대 생성·수정 문장을 포함하고, `adminEventDeletionRepository`는 삭제 문장만 포함한다는 별도 정규식 검증을 추가한다.

- [ ] **Step 4: 에뮬레이터 테스트 정리 함수를 양끝에 적용**

각 테스트가 사용하는 컬렉션을 명시하고 `try/finally`로 종료 정리를 보장한다.

```ts
const TEST_COLLECTIONS = [
  'events',
  'eventSlugIndex',
  'eventSecrets',
  'billingFulfillments',
  'eventDeletionJobs',
  'customerWallets',
];

async function clearTestCollections() {
  for (const collectionName of TEST_COLLECTIONS) {
    await db.recursiveDelete(db.collection(collectionName));
  }
}
```

`test-admin-event-deletion-emulator.mts` 종료 시 `event-incomplete-deletion`, `event-missing-deletion-metadata`를 포함해 정리하고, demo 테스트는 시작 전 자신의 `events`, `eventSlugIndex`, `demoExperiences` 상태를 초기화한다.

- [ ] **Step 5: GREEN 검증**

Run:

```powershell
node scripts/run-test-suite.mjs test-admin-event-preview-links
node scripts/run-test-suite.mjs test-security-hardening
npm run test:emulator
```

Expected: 모두 exit code 0.

---

### Task 2: 런타임과 모바일 의존성 보안 업데이트

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/package-lock.json`
- Test: `scripts/test-image-upload-optimization.mts`
- Test: `scripts/test-editable-image-upload-validation.mts`

**Interfaces:**
- Consumes: 기존 `sharp` 최적화 옵션과 Expo SDK 55 호환 표
- Produces: Next 15.5.24, Firebase 12.18.0, Firebase Admin 13.10.0, sharp 0.35.4, Expo 55.0.30 lockfile

- [ ] **Step 1: 이미지 계약 테스트를 업데이트 전 실행**

Run:

```powershell
node scripts/run-test-suite.mjs test-image-upload-optimization
node scripts/run-test-suite.mjs test-editable-image-upload-validation
```

Expected: 현재 구현 계약이 통과해 업데이트 전 기준선을 확보한다.

- [ ] **Step 2: 웹 의존성을 명시 버전으로 업데이트**

Run:

```powershell
npm install next@15.5.24 eslint-config-next@15.5.24 firebase@12.18.0 firebase-admin@13.10.0 sharp@0.35.4
```

`package.json`과 `package-lock.json` 외 파일이 바뀌지 않았는지 확인한다.

- [ ] **Step 3: Expo SDK 55 패치 업데이트**

Run:

```powershell
npm --prefix apps/mobile install expo@55.0.30
npx --yes expo install --fix --cwd apps/mobile
```

Expected: Expo SDK 메이저가 55로 유지되고 React Native 메이저가 바뀌지 않는다.

- [ ] **Step 4: 보안·호환성 GREEN 검증**

Run:

```powershell
node scripts/run-test-suite.mjs test-image-upload-optimization
node scripts/run-test-suite.mjs test-editable-image-upload-validation
npm run typecheck
npm audit --omit=dev --audit-level=high
npm --prefix apps/mobile audit --omit=dev --audit-level=high
```

Expected: 이미지 계약과 타입 검사가 통과한다. 감사 잔여 항목은 직접 런타임 경로와 개발 도구 경로를 구분해 기록하며, 강제 메이저 업그레이드는 하지 않는다.

---

### Task 3: 위저드 초기 상태와 테마 선택 경험 개선

**Files:**
- Modify: `scripts/test-page-wizard-workspace.mts`
- Modify: `src/app/page-wizard/pageWizardWorkspaceState.ts`
- Modify: `src/app/page-wizard/PageWizardWorkspace.tsx`
- Modify: `src/app/page-wizard/PageWizardWorkspace.module.css`
- Modify: `src/app/page-wizard/steps/ThemeStep.tsx`
- Modify: `src/app/page-wizard/page.module.css`

**Interfaces:**
- Consumes: `WizardSaveStatus`, `WizardSectionValidation`, `InvitationThemeKey`
- Produces: `getWizardSaveStatusLabel(status)`, 유효성에 근거한 섹션 상태, 미리보기 가능한 테마 카드

- [ ] **Step 1: 초기 상태와 섹션 상태 RED 테스트 작성**

```ts
assert.equal(getWizardSaveStatusLabel('idle'), '편집 준비됨');
assert.equal(getWizardSaveStatusLabel('dirty'), '변경사항 있음');
assert.equal(
  getWizardSectionStatus({ isActive: false, valid: true, hasMeaningfulInput: false }),
  '미입력'
);
```

같은 테스트에서 `ThemeStep.tsx` 소스를 읽어 각 테마 카드가 `aria-pressed`, 테마 라벨, 설명, `data-theme-preview` 시각 미리보기 요소를 포함한다는 검증을 추가한다.

- [ ] **Step 2: RED 확인**

Run:

```powershell
node scripts/run-test-suite.mjs test-page-wizard-workspace
```

Expected: 새 라벨·상태 함수·미리보기 계약이 없어 실패한다.

- [ ] **Step 3: 상태 계산을 순수 함수로 구현**

```ts
export function getWizardSaveStatusLabel(status: WizardSaveStatus) {
  return {
    idle: '편집 준비됨',
    dirty: '변경사항 있음',
    saving: '저장 중',
    saved: '저장됨',
    error: '저장 실패',
  }[status];
}
```

섹션은 현재 작업이면 `현재 작업`, 유효성 오류가 있으면 `확인 필요 N개`, 의미 있는 입력이 없으면 `미입력`, 그 외 유효하면 `완료`로 표시한다. `hasMeaningfulInput`은 기존 폼 값과 단계별 필수 필드 판정을 재사용한다.

- [ ] **Step 4: 테마 선택 카드를 비교 가능한 그리드로 변경**

각 카드에 `data-theme-preview={theme}`, 테마별 기존 CSS 토큰을 사용한 소형 표지 미리보기, 라벨, 설명, 선택 상태를 배치한다. 내부 고정 높이 스크롤을 제거하고 페이지 흐름에서 자연스럽게 확장되도록 한다.

- [ ] **Step 5: GREEN 및 접근성 검증**

Run:

```powershell
node scripts/run-test-suite.mjs test-page-wizard-workspace
node scripts/run-test-suite.mjs test-wedding-theme-accessibility
```

Expected: 모두 통과하고 키보드로 테마 카드를 선택할 수 있다.

---

### Task 4: 관리자 체험 화면과 필터 밀도 개선

**Files:**
- Modify: `src/app/experience/admin/layout.tsx`
- Modify: `src/app/admin/_components/AdminEventFilters.tsx`
- Modify: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Modify: `src/app/admin/page.module.css`
- Modify: `scripts/test-admin-event-workspace-model.mts`
- Modify: `scripts/test-demo-experience-admin-gateway.mts`

**Interfaces:**
- Consumes: `AdminEventFilters`, `onQueryChange`, `ADMIN_EVENT_PAGE_SIZE_OPTIONS`
- Produces: 기본 검색·공개 상태와 접을 수 있는 상세 필터, 실제 관리자와 같은 체험 운영 토큰 경계

- [ ] **Step 1: UI 계약 RED 테스트 추가**

```ts
assert.match(experienceAdminLayoutSource, /data-operation-ui/);
assert.match(adminEventFiltersSource, /<details/);
assert.match(adminEventFiltersSource, />상세 필터</);
assert.match(adminEventFiltersSource, /aria-label="이벤트 검색 및 필터"/);
```

페이지 크기 선택은 `AdminEventFilters`의 상세 영역 안에 존재하고 `pageSize` 쿼리를 그대로 갱신하는지 검증한다.

- [ ] **Step 2: RED 확인**

Run:

```powershell
node scripts/run-test-suite.mjs test-admin-event-workspace-model
node scripts/run-test-suite.mjs test-demo-experience-admin-gateway
```

- [ ] **Step 3: 필터 표시 구조만 재배치**

기본 영역에는 검색, 공개 상태, 상세 필터 토글, 초기화를 둔다. 상세 영역에는 유형, 고객 연결, 정렬, 페이지당 개수를 둔다. `filters`와 `onQueryChange`에 `pageSize`를 추가하되 URL 키와 기본값은 기존과 동일하게 유지한다.

```tsx
<details className={styles.eventAdvancedFilters}>
  <summary>상세 필터</summary>
  <div className={styles.eventAdvancedFilterGrid}>{/* 기존 select 재사용 */}</div>
</details>
```

- [ ] **Step 4: 체험 레이아웃 토큰 경계 통일**

```tsx
<div data-admin-ui data-operation-ui>
  {children}
</div>
```

- [ ] **Step 5: GREEN 검증**

Run:

```powershell
node scripts/run-test-suite.mjs test-admin-event-workspace-model
node scripts/run-test-suite.mjs test-demo-experience-admin-gateway
```

Expected: 쿼리 의미와 필터 결과가 기존과 동일하고 새 UI 계약이 통과한다.

---

### Task 5: 웨딩 공개 페이지 공통 마무리 추가

**Files:**
- Create: `src/app/_components/WeddingClosing.tsx`
- Create: `src/app/_components/WeddingClosing.module.css`
- Modify: `src/app/_components/weddingPageRenderers.tsx`
- Modify: `scripts/test-public-invitation-visual-world.mts`
- Modify: `scripts/test-wedding-theme-style-contracts.mts`

**Interfaces:**
- Consumes: `WeddingThemeRendererProps`, 신랑·신부 이름, 테마 키
- Produces: 모든 웨딩 렌더러의 마지막에 한 번만 렌더링되는 `WeddingClosing`

- [ ] **Step 1: 공통 마무리 RED 테스트 작성**

```ts
assert.match(rendererSource, /<WeddingClosing/);
assert.match(closingSource, /data-wedding-closing/);
assert.match(closingSource, /귀한 걸음과 따뜻한 마음에 감사드립니다/);
```

각 웨딩 테마 렌더러가 계좌 정보의 활성화 여부와 무관하게 공통 마무리를 거친다는 소스 계약을 추가한다.

- [ ] **Step 2: RED 확인**

Run:

```powershell
node scripts/run-test-suite.mjs test-public-invitation-visual-world
node scripts/run-test-suite.mjs test-wedding-theme-style-contracts
```

- [ ] **Step 3: 공통 렌더러 경계에 마무리 구현**

```tsx
<WeddingClosing
  groomName={state.pageConfig.groomName}
  brideName={state.pageConfig.brideName}
  theme={props.options.theme}
/>
```

`definition.sections` 뒤에 렌더링하여 선택 섹션과 계좌 정보가 마지막 콘텐츠가 되지 않게 한다. 기존 자체 footer가 있는 romantic 테마는 중복 마무리가 되지 않도록 정의 옵션 `renderClosing?: false`를 제공하거나 기존 footer를 공통 컴포넌트로 대체한다.

- [ ] **Step 4: 테마 독립성을 유지하는 CSS 작성**

단색 배경, 1px 구분선, 최대 34px 이하 글자, 500 중심 두께를 사용한다. `data-theme` 속성으로 색·폰트만 기존 테마 변수에 연결하고 그림자나 불필요한 반경은 추가하지 않는다.

- [ ] **Step 5: GREEN 검증**

Run:

```powershell
node scripts/run-test-suite.mjs test-public-invitation-visual-world
node scripts/run-test-suite.mjs test-wedding-theme-style-contracts
node scripts/run-test-suite.mjs test-public-invitation-behavior
```

---

### Task 6: README와 운영 문서 동기화

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Test: `scripts/test-route-docs-consistency.mts`
- Test: `scripts/validate-theme-extension.mts`

**Interfaces:**
- Consumes: `src/lib/invitationThemes.ts`, `package.json` scripts
- Produces: 실제 테마 레지스트리와 검증 명령을 반영한 문서

- [ ] **Step 1: 문서 계약 RED 테스트 추가**

README가 `gyeol`, `classic-r`, 테마 확장 체크리스트, `npm run test:security`, `npm run test:emulator`를 포함하는지 검증한다.

- [ ] **Step 2: RED 확인**

Run:

```powershell
node scripts/run-test-suite.mjs test-route-docs-consistency
node scripts/run-test-suite.mjs validate-theme-extension
```

- [ ] **Step 3: 문서 갱신**

테마 수를 고정 문장으로 중복 서술하지 않고 현재 지원 테마를 이벤트 유형별 표로 정리한다. 검증 섹션은 실제 `package.json` 스크립트만 나열하고, 보안·에뮬레이터 테스트의 전제 조건을 설명한다.

- [ ] **Step 4: GREEN 확인**

Run:

```powershell
node scripts/run-test-suite.mjs test-route-docs-consistency
node scripts/run-test-suite.mjs validate-theme-extension
```

---

### Task 7: 통합 검증과 브라우저 QA

**Files:**
- Verify only: 전체 변경 파일
- Modify only if a regression is reproduced: 해당 작업의 파일과 테스트

**Interfaces:**
- Consumes: Tasks 1–6의 통합 결과
- Produces: 깨끗한 Git 상태와 검증 증거

- [ ] **Step 1: 정적·계약 검증**

Run:

```powershell
npm run check
npm test
npm run test:security
npm run test:architecture
```

Expected: 모두 exit code 0.

- [ ] **Step 2: 에뮬레이터와 빌드 검증**

Run:

```powershell
npm run test:emulator
npm run build
```

Expected: 에뮬레이터 6개 테스트와 프로덕션 빌드가 통과한다. 빌드가 기존 `clean:next`로 `.next`를 재생성했다는 점을 최종 보고에 남긴다.

- [ ] **Step 3: 보안 감사 확인**

Run:

```powershell
npm audit --omit=dev --audit-level=high
npm --prefix apps/mobile audit --omit=dev --audit-level=high
```

잔여 취약점은 패키지, 경로, 런타임 도달 가능성, 이번 범위에서 해결하지 않은 이유를 기록한다.

- [ ] **Step 4: 브라우저 QA**

`npm run dev -- -p 3100`으로 실행하고 다음 화면을 데스크톱 1280×720과 모바일 390×844에서 확인한다.

- `/`
- `/experience/admin`
- `/experience/page-wizard`
- `/kim-shinlang-na-sinbu/emotional`
- `/kim-shinlang-na-sinbu/gyeol`

확인 항목은 콘솔 오류, 가로 넘침, 키보드 포커스, 초기 저장 라벨, 테마 미리보기, 상세 필터, 페이지 마지막 마무리다.

- [ ] **Step 5: 코드 리뷰와 최종 커밋**

`superpowers:requesting-code-review`로 명세 충족과 회귀 위험을 독립 검토한다. 지적 사항을 반영한 뒤 `git diff --check`, `git status --short`를 확인하고 프로젝트 규칙에 맞는 한국어 명사형 커밋을 생성한다. 푸시와 배포는 하지 않는다.
