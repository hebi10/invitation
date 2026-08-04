# Page Wizard Clean Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 위저드의 모든 입력·검증·저장·권한·미리보기 기능을 보존하면서 관리자와 고객이 모든 화면 크기에서 사용할 수 있는 6개 작업 영역 기반의 클린 워크스페이스로 교체한다.

**Architecture:** 기존 `WizardStepKey`, 단계 컴포넌트, 상태 훅과 저장 게이트웨이를 데이터 진실로 유지한다. 새 순수 매핑 모듈이 이벤트별 단계 목록을 최대 6개 작업 영역으로 묶고, 새 프레젠테이션 컴포넌트가 목차·입력 영역·미리보기·하단 작업 바를 렌더링한다. `PageWizardClient`는 기존 상태와 핸들러를 새 셸에 연결하며 저장 스키마·API·인증 흐름은 변경하지 않는다.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, TanStack Query, Firebase, 기존 Node/tsx 테스트 러너

## Global Constraints

- 기존 입력 항목, 이벤트 유형별 단계와 문구, 검증, 저장 스키마, API, 인증·인가, 공개·초안 동작을 보존한다.
- 이벤트 유형과 생성·수정 모드별 기존 단계 키를 새 작업 영역에 중복·누락 없이 같은 순서로 배치한다.
- 관리자와 고객 모두 데스크톱과 모바일에서 전체 기능을 사용할 수 있어야 한다.
- 크림색 배경, 명조 장식 제목, 장식용 그라데이션, 과도한 캡슐 버튼, 반복 카드 중첩, 장식용 그림자를 사용하지 않는다.
- 흰색·중립 회색, 시스템 고딕, 한 가지 절제된 강조색, 여백과 얇은 구분선을 사용한다.
- 새 의존성을 추가하지 않는다. Swiper 패키지는 다른 화면에서 사용할 수 있으므로 제거하지 않는다.
- `src/app/admin/_components/AdminEventList.tsx`의 기존 사용자 변경을 수정하거나 되돌리지 않는다.
- 사용자가 요청하지 않았으므로 커밋·푸시·배포하지 않는다. 아래 작업에는 커밋 단계를 포함하지 않는다.
- UI 편집 직전에 `C:\Users\박도영\.agents\skills\impeccable\reference\craft-floor.md`를 읽고 품질 제한을 적용한다.

---

## File Map

- Create `src/app/page-wizard/pageWizardSections.ts`: 기존 단계와 새 작업 영역 사이의 순수 매핑·검증 집계.
- Create `src/app/page-wizard/PageWizardWorkspace.tsx`: 상단 바, 반응형 목차, 입력 섹션, 미리보기, 작업 버튼을 렌더링하는 표현 컴포넌트.
- Create `src/app/page-wizard/PageWizardWorkspace.module.css`: 워크스페이스 전용 반응형 레이아웃과 시각 토큰.
- Create `scripts/test-page-wizard-workspace.mts`: 모든 이벤트·생성/수정 조합에서 단계 누락·중복·순서 변경을 방지하는 테스트.
- Modify `scripts/run-test-suite.mjs`: 새 테스트를 core suite에 등록.
- Modify `src/app/page-wizard/hooks/useWizardNavigation.ts`: 단일 단계가 아니라 작업 영역 단위로 검증·저장·이동.
- Modify `src/app/page-wizard/PageWizardClient.tsx`: Swiper 표현 제거, 새 작업 영역·미리보기 상태·저장 상태 연결.
- Modify `src/app/page-wizard/layout.tsx`: 이 화면에서 더 이상 필요 없는 Swiper CSS import 제거.
- Modify `src/app/page-wizard/page.module.css`: 기존 단계 내부 폼과 인증·오류 상태를 중립적인 운영 UI로 정리.
- Modify `src/app/page-wizard/pageWizardEditorPanels.module.css`: 필드·하위 섹션·버튼 스타일을 새 시각 체계에 맞춤.
- Create or update `DESIGN.md` and its Impeccable sidecar at finish: 실제 구현에서 확정된 디자인 시스템 기록.

---

### Task 1: 작업 영역 매핑과 누락 방지 테스트

**Files:**
- Create: `scripts/test-page-wizard-workspace.mts`
- Create: `src/app/page-wizard/pageWizardSections.ts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: `WizardStepDefinition`, `WizardStepKey`, `StepValidation` from `pageWizardData.ts`.
- Produces: `WizardSectionId`, `WizardSection`, `buildWizardSections()`, `flattenWizardSectionStepKeys()`, `getWizardSectionValidation()`.

- [ ] **Step 1: 새 테스트를 core suite에 등록한다**

`scripts/run-test-suite.mjs`의 `core` 배열에 `test-page-wizard-workspace`를 `test-page-wizard-event-type-lock` 다음에 추가한다.

- [ ] **Step 2: 단계 완전성 테스트를 작성한다**

`scripts/test-page-wizard-workspace.mts`에 다음 검증을 작성한다.

```ts
import assert from 'node:assert/strict';

import { EVENT_TYPE_KEYS } from '../src/lib/eventTypes.ts';
import { getWizardSteps } from '../src/app/page-wizard/pageWizardData.ts';
import {
  buildWizardSections,
  flattenWizardSectionStepKeys,
} from '../src/app/page-wizard/pageWizardSections.ts';

for (const eventType of EVENT_TYPE_KEYS) {
  for (const includeSetupSteps of [true, false]) {
    for (const includeEventTypeStep of [true, false]) {
      const steps = getWizardSteps({
        eventType,
        includeSetupSteps,
        includeEventTypeStep,
      });
      const sections = buildWizardSections(steps);
      const flattened = flattenWizardSectionStepKeys(sections);

      assert.deepEqual(
        flattened,
        steps.map((step) => step.key),
        `${eventType} 단계 순서와 작업 영역 순서가 같아야 합니다.`
      );
      assert.equal(new Set(flattened).size, flattened.length);
      assert.ok(sections.length > 0 && sections.length <= 6);
      assert.equal(sections.every((section) => section.steps.length > 0), true);
    }
  }
}

console.log('page wizard workspace mapping checks passed');
```

- [ ] **Step 3: 테스트가 모듈 부재로 실패하는지 확인한다**

Run: `node scripts/run-test-suite.mjs test-page-wizard-workspace`

Expected: FAIL because `pageWizardSections.ts` does not exist.

- [ ] **Step 4: 작업 영역 매핑을 구현한다**

`src/app/page-wizard/pageWizardSections.ts`에 다음 공개 타입과 함수를 구현한다.

```ts
import type {
  StepValidation,
  WizardStepDefinition,
  WizardStepKey,
} from './pageWizardData';

export type WizardSectionId =
  | 'setup'
  | 'basic'
  | 'schedule'
  | 'greeting'
  | 'media'
  | 'review';

export type WizardSection = {
  id: WizardSectionId;
  title: string;
  description: string;
  steps: WizardStepDefinition[];
};

export type WizardSectionValidation = StepValidation & {
  invalidStepKeys: WizardStepKey[];
};

const SECTION_DEFINITIONS: Array<
  Omit<WizardSection, 'steps'> & { stepKeys: WizardStepKey[] }
> = [
  { id: 'setup', title: '시작 설정', description: '페이지 유형과 기본 구성을 정합니다.', stepKeys: ['eventType', 'theme', 'slug'] },
  { id: 'basic', title: '기본 정보', description: '첫 화면에 필요한 정보를 입력합니다.', stepKeys: ['basic'] },
  { id: 'schedule', title: '일정과 장소', description: '날짜, 시간과 방문 정보를 입력합니다.', stepKeys: ['schedule', 'venue'] },
  { id: 'greeting', title: '인사말과 관계 정보', description: '초대 문구와 관계 정보를 입력합니다.', stepKeys: ['greeting'] },
  { id: 'media', title: '사진과 부가 기능', description: '사진, 음악과 추가 안내를 설정합니다.', stepKeys: ['images', 'music', 'extra'] },
  { id: 'review', title: '검토 및 저장', description: '전체 내용을 확인하고 저장합니다.', stepKeys: ['final'] },
];

export function buildWizardSections(steps: WizardStepDefinition[]): WizardSection[];
export function flattenWizardSectionStepKeys(sections: WizardSection[]): WizardStepKey[];
export function getWizardSectionValidation(
  section: WizardSection,
  getValidationForStep: (stepKey: WizardStepKey) => StepValidation
): WizardSectionValidation;
```

`buildWizardSections()`는 `steps`의 원래 순서를 기준으로 각 정의의 포함 단계를 필터링하고 빈 영역을 제거한다. `flattenWizardSectionStepKeys()`는 `sections.flatMap(section => section.steps.map(step => step.key))`를 반환한다. `getWizardSectionValidation()`은 포함 단계 검증을 순서대로 합쳐 오류 메시지와 `invalidStepKeys`를 반환한다.

- [ ] **Step 5: 매핑 테스트가 통과하는지 확인한다**

Run: `node scripts/run-test-suite.mjs test-page-wizard-workspace`

Expected: PASS and `page wizard workspace mapping checks passed`.

---

### Task 2: 작업 영역 이동·검증·저장 흐름

**Files:**
- Modify: `scripts/test-page-wizard-workspace.mts`
- Modify: `src/app/page-wizard/pageWizardSections.ts`
- Modify: `src/app/page-wizard/hooks/useWizardNavigation.ts`

**Interfaces:**
- Consumes: Task 1의 `WizardSection`, `getWizardSectionValidation()`.
- Produces: `findWizardSectionByStepKey()`, `getAdjacentWizardSection()`, 영역 기반 `useWizardNavigation()` 반환값.

- [ ] **Step 1: 경계와 오류 순서 테스트를 추가한다**

테스트 파일에 다음 케이스를 추가한다.

```ts
const weddingSteps = getWizardSteps({
  eventType: 'wedding',
  includeSetupSteps: true,
  includeEventTypeStep: false,
});
const weddingSections = buildWizardSections(weddingSteps);

assert.equal(findWizardSectionByStepKey(weddingSections, 'slug')?.id, 'setup');
assert.equal(getAdjacentWizardSection(weddingSections, 'setup', -1), null);
assert.equal(getAdjacentWizardSection(weddingSections, 'setup', 1)?.id, 'basic');

const setupValidation = getWizardSectionValidation(
  weddingSections[0],
  (stepKey) => stepKey === 'slug'
    ? { valid: false, messages: ['페이지 주소를 확인해 주세요.'] }
    : { valid: true, messages: [] }
);
assert.deepEqual(setupValidation.invalidStepKeys, ['slug']);
assert.equal(setupValidation.valid, false);
```

- [ ] **Step 2: 새 헬퍼 import 때문에 실패하는지 확인한다**

Run: `node scripts/run-test-suite.mjs test-page-wizard-workspace`

Expected: FAIL because `findWizardSectionByStepKey` and `getAdjacentWizardSection` are not exported.

- [ ] **Step 3: 순수 탐색 헬퍼를 구현한다**

```ts
export function findWizardSectionByStepKey(
  sections: WizardSection[],
  stepKey: WizardStepKey
): WizardSection | null;

export function getAdjacentWizardSection(
  sections: WizardSection[],
  sectionId: WizardSectionId,
  offset: -1 | 1
): WizardSection | null;
```

존재하지 않는 단계나 경계 밖 이동은 `null`을 반환한다.

- [ ] **Step 4: `useWizardNavigation`을 영역 기반으로 변경한다**

기존 공개 인수 중 `steps`와 `activeStepKey`는 유지하고 `sections: WizardSection[]`를 추가한다. 반환값을 아래와 같이 확장한다.

```ts
return {
  activeStep,
  activeStepIndex,
  activeSection,
  activeSectionIndex,
  handleMoveNext,
  handleMovePrevious,
  handleSelectSection,
  handleFinalConfirm,
};
```

동작 규칙은 다음과 같다.

- `activeSection`은 `findWizardSectionByStepKey(sections, activeStepKey)`로 결정한다.
- 다음 이동은 `getWizardSectionValidation(activeSection, getValidationForStep)` 전체를 먼저 검사한다.
- 실패하면 첫 `invalidStepKeys[0]`을 `slideToStep()`으로 활성화하고 기존 오류 알림을 표시한다.
- 현재 영역에 `slug`가 포함되면 기존 slug 초안 생성과 URL 교체 로직을 그대로 실행한다.
- 그 외 영역은 기존 조건과 동일하게 조용한 초안 저장을 실행한다.
- 성공하면 다음 영역의 첫 단계 키로 이동한다.
- 이전 이동은 이전 영역의 첫 단계 키로 이동한다.
- `handleSelectSection(sectionId)`은 목차 직접 이동용이며 현재 입력을 지우지 않고 알림만 정리한다.
- 최종 확인은 기존 `buildReviewSummary()`로 모든 기존 단계를 검증하고 첫 오류 단계가 포함된 영역으로 이동한다.

- [ ] **Step 5: 매핑 테스트와 기존 저장 경로 테스트를 실행한다**

Run: `node scripts/run-test-suite.mjs test-page-wizard-workspace`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-customer-page-wizard-save-route`

Expected: PASS.

---

### Task 3: 클린 워크스페이스 표현 컴포넌트

**Files:**
- Create: `src/app/page-wizard/PageWizardWorkspace.tsx`
- Create: `src/app/page-wizard/PageWizardWorkspace.module.css`

**Interfaces:**
- Consumes: `WizardSection`, `WizardSectionId`, `WizardSectionValidation`, `WizardStepKey`.
- Produces: `PageWizardWorkspace` default component and `WizardSaveStatus` type.

- [ ] **Step 1: 컴포넌트 공개 계약을 구현한다**

```tsx
export type WizardSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type PageWizardWorkspaceProps = {
  title: string;
  subtitle: string;
  sections: WizardSection[];
  activeSection: WizardSection;
  activeStepKey: WizardStepKey;
  getSectionValidation: (section: WizardSection) => WizardSectionValidation;
  saveStatus: WizardSaveStatus;
  notice: ReactNode;
  isSaving: boolean;
  published: boolean;
  previewStepKey: WizardStepKey | null;
  renderStepContent: (stepKey: WizardStepKey) => ReactNode;
  renderStepPreview: (stepKey: WizardStepKey) => ReactNode;
  onSelectSection: (sectionId: WizardSectionId) => void;
  onSelectStep: (stepKey: WizardStepKey) => void;
  onOpenPreview: (stepKey: WizardStepKey) => void;
  onClosePreview: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinalConfirm: () => void;
};
```

정적 방향 계약은 사용자 입력을 포함하지 않는 상수로 정의하고 루트 안의 숨김 요소에 HTML 주석으로 출력한다.

```tsx
const DIRECTION_CONTRACT = `<!--
THESIS: 초대장 편집기는 장식 화면이 아니라 누락 없이 정보를 완성하는 작업 공간이다.
OWN-WORLD: 중립 배경, 먹색 글자, 파란 단일 강조, 시스템 고딕, 1px 구분선, 6~8px 제어 반경.
STORY: 현재 위치와 오류를 확인하고, 관련 정보를 입력하고, 필요할 때 미리본 뒤 저장한다.
FIRST VIEWPORT: 상단 작업 바, 왼쪽 목차, 중앙 입력, 하단 주요 동작.
FORM: Operate 모드의 2열 데스크톱·단일 열 모바일 편집 워크스페이스.
-->`;

<div
  hidden
  aria-hidden="true"
  dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }}
/>
```

문자열은 정적 상수만 사용하며 폼 값이나 외부 데이터를 삽입하지 않는다.

마크업은 다음 순서를 지킨다.

1. `header`: 제목·주소/상태·저장 상태·미리보기 버튼
2. `aside` + `nav aria-label="작업 영역"`: 작업 영역 버튼과 텍스트 상태
3. `main`: 현재 영역 제목과 포함된 기존 단계별 `section`
4. 각 단계 제목 옆에 `previewSection`이 있을 때만 미리보기 버튼
5. `footer`: 이전·다음 또는 최종 저장 버튼
6. 미리보기 열림 시 `role="dialog" aria-modal="true"`, 제목, 닫기 버튼, 기존 미리보기 노드

목차 버튼은 현재 영역에 `aria-current="step"`을 적용한다. 모바일 목차 열림 상태와 마지막 포커스 요소는 컴포넌트 내부에서 관리하고, 다이얼로그를 닫으면 열었던 버튼으로 포커스를 복원한다.

- [ ] **Step 2: 워크스페이스 CSS를 구현한다**

`PageWizardWorkspace.module.css`은 다음 고정 구조를 사용한다.

```css
.workspace {
  --workspace-accent: #315efb;
  --workspace-ink: #17191f;
  --workspace-muted: #626975;
  --workspace-line: #dfe3e8;
  min-height: 100dvh;
  background: #f5f6f8;
  color: var(--workspace-ink);
}

.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 760px);
  justify-content: center;
  gap: 32px;
  padding: 32px 24px 112px;
}

@media (max-width: 900px) {
  .layout { display: block; padding: 16px 16px 104px; }
  .desktopNav { display: none; }
  .mobileSectionTrigger { display: flex; }
}
```

상단 바와 하단 작업 바는 `position: sticky` 또는 `fixed`를 사용하되 본문과 겹치지 않도록 동일한 높이만큼 여백을 확보한다. 카드 중첩, 장식 그라데이션, 그림자, 999px 캡슐 반경을 사용하지 않는다. 입력과 버튼은 6~8px 반경, 1px 구분선, 최소 44px 터치 크기를 사용한다.

- [ ] **Step 3: 표현 컴포넌트의 정적 검증을 실행한다**

Run: `npm run typecheck:web`

Expected: PASS. 실제 마크업·접근성·반응형 동작은 Task 6에서 크롬의 렌더 결과와 키보드 상호작용으로 검증한다.

---

### Task 4: `PageWizardClient` 통합과 Swiper 제거

**Files:**
- Modify: `src/app/page-wizard/PageWizardClient.tsx`
- Modify: `src/app/page-wizard/layout.tsx`
- Modify: `src/app/page-wizard/hooks/useWizardPreviewState.ts`

**Interfaces:**
- Consumes: Tasks 1~3의 작업 영역 모델, 영역 내비게이션, `PageWizardWorkspace`.
- Produces: 기존 라우트와 상태를 새 워크스페이스에 연결한 편집 화면.

- [ ] **Step 1: Swiper 상태와 효과를 제거한다**

`PageWizardClient.tsx`에서 다음 항목을 제거한다.

- `SwiperType`, `Pagination`, `Swiper`, `SwiperSlide` import
- `swiperRef`
- `updateSwiperLayout()`과 Swiper 관찰·갱신 전용 effects
- 하단의 `<Swiper>` 렌더 트리

`layout.tsx`에서 `swiper/css`, `swiper/css/pagination` import를 제거한다. 패키지 의존성은 유지한다.

- [ ] **Step 2: 작업 영역과 미리보기 상태를 연결한다**

```tsx
const wizardSections = useMemo(
  () => buildWizardSections(wizardSteps),
  [wizardSteps]
);
const [previewStepKey, setPreviewStepKey] = useState<WizardStepKey | null>(null);
const activeSection = findWizardSectionByStepKey(wizardSections, activeStepKey)
  ?? wizardSections[0];
```

기존 `slideToStep()`은 Swiper 호출 없이 `setActiveStepKey(stepKey)`와 포커스 대상 스크롤만 수행하도록 이름을 `moveToStep()`으로 바꾼다. 이벤트 유형 변경으로 현재 키가 사라지면 첫 작업 영역의 첫 단계로 이동한다.

- [ ] **Step 3: 저장 상태를 명시적으로 관리한다**

기존 무시하던 `lastSavedAt`을 상태로 보존하고 아래 값을 계산한다.

```ts
const saveStatus: WizardSaveStatus = isSaving
  ? 'saving'
  : notice?.tone === 'error'
    ? 'error'
    : lastSavedAt
      ? 'saved'
      : 'idle';
```

저장 실패 외의 입력 검증 오류는 워크스페이스 상단에서 `확인 필요`로 표현하고, 기존 오류 안내를 유지한다. 저장 실패 문구는 기존 `청첩장을 저장하지 못했습니다.` 경로에서만 `저장 실패`로 표시되도록 `NoticeState`에 선택적 `source: 'save' | 'validation' | 'general'`을 추가하고 관련 호출부를 명시적으로 지정한다.

- [ ] **Step 4: 새 셸을 렌더링한다**

기존 메인 위저드 반환부만 `PageWizardWorkspace`로 교체한다. `renderStepContent()`와 `PageWizardStepPreview`는 그대로 재사용한다. 각 작업 영역에 포함된 모든 단계가 렌더링되며, 미리보기는 선택한 기존 단계 키를 사용한다. 로딩·로그인·소유권·접근 제한 반환부는 이 단계에서 동작을 변경하지 않는다.

- [ ] **Step 5: 통합 관련 자동 검증을 실행한다**

Run: `node scripts/run-test-suite.mjs test-page-wizard-workspace`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS with no TypeScript errors.

---

### Task 5: 기존 단계 폼과 상태 화면의 시각 통일

**Files:**
- Modify: `src/app/page-wizard/page.module.css`
- Modify: `src/app/page-wizard/pageWizardEditorPanels.module.css`
- Modify: `src/app/page-wizard/PageWizardClient.tsx`

**Interfaces:**
- Consumes: Task 3의 워크스페이스 토큰과 기존 단계 컴포넌트 class names.
- Produces: 이벤트 유형과 역할에 무관한 중립적 폼·상태 화면.

- [ ] **Step 1: UI 편집 직전 품질 기준을 읽는다**

Run: `Get-Content -Raw -Encoding UTF8 'C:\Users\박도영\.agents\skills\impeccable\reference\craft-floor.md'`

Expected: complete file output; apply its bans and quality floor to Tasks 5~7.

- [ ] **Step 2: 이벤트별 장식 테마 적용을 제거한다**

`PageWizardClient.tsx`의 `pageClassName`은 편집 화면에서 항상 `styles.page`를 사용한다. 생일·돌잔치·일반 행사·개업은 문구와 입력 필드는 달라지지만 편집 도구의 시각 체계는 동일하게 만든다.

- [ ] **Step 3: `page.module.css`의 외부 셸과 단계 스타일을 정리한다**

다음 기존 장식 규칙을 제거하거나 중립 규칙으로 교체한다.

- `Luxury wedding wizard overrides`의 크림색 배경, 명조, 그라데이션, 큰 둥근 카드, 그림자
- `pageBirthday`, `pageFirstBirthday`, `pageGeneralEvent`, `pageOpening`의 편집 화면용 장식 변형
- Swiper pagination과 slide 전용 규칙
- 중복 정의된 `progressBar`, `stepHeader`, `viewTabs`, `slideFooter`

기존 단계 컴포넌트가 사용하는 필드·선택지·업로드·음악·검토 class는 유지하되 아래 기준으로 통일한다.

```css
.input,
.textarea,
.choiceSelectButton,
.musicSelectButton {
  border: 1px solid #cfd5dd;
  border-radius: 8px;
  background: #fff;
  color: #17191f;
}

.input:focus,
.textarea:focus,
.choiceSelectButton:focus-visible {
  outline: 3px solid rgba(49, 94, 251, 0.18);
  outline-offset: 1px;
  border-color: #315efb;
}
```

단계 내부 큰 묶음은 배경 카드 대신 `padding-top`과 `border-top`으로 구분한다. 상태 배지는 작은 사각형 라벨로 만들고 텍스트를 유지한다.

- [ ] **Step 4: 편집 패널 CSS를 통일한다**

`pageWizardEditorPanels.module.css`에서 입력 반경을 8px, 하위 섹션 반경을 6px 이하로 줄인다. `subCard`와 `nestedCard`는 그림자 없이 `border-top` 또는 단일 1px 테두리로 구분한다. 필수·선택 배지는 캡슐 배경 대신 텍스트 라벨로 표시하고 모든 버튼은 최소 높이 44px을 유지한다.

- [ ] **Step 5: 인증·오류·소유권 화면을 같은 시각 체계로 맞춘다**

기존 `gateCard`, `centerCard`, 로그인 카드 주변 배경에서 크림색·그라데이션·그림자를 제거한다. 문구와 버튼 동작은 변경하지 않는다.

- [ ] **Step 6: 스타일 변경 후 정적 검증을 실행한다**

Run: `npm run lint:web`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

---

### Task 6: 반응형·접근성·동작 검증

**Files:**
- Modify if defects are found: `src/app/page-wizard/PageWizardWorkspace.tsx`
- Modify if defects are found: `src/app/page-wizard/PageWizardWorkspace.module.css`
- Modify if defects are found: `src/app/page-wizard/page.module.css`
- Modify if defects are found: `src/app/page-wizard/pageWizardEditorPanels.module.css`

**Interfaces:**
- Consumes: 완성된 워크스페이스와 기존 개발 서버 `http://localhost:3000`.
- Produces: 데스크톱·모바일에서 검증된 관리자·고객 편집 흐름과 캡처 파일.

- [ ] **Step 1: 관련 자동 테스트를 실행한다**

Run: `node scripts/run-test-suite.mjs test-page-wizard-workspace`

Run: `node scripts/run-test-suite.mjs test-page-wizard-event-type-lock`

Run: `node scripts/run-test-suite.mjs test-page-wizard-schedule-time`

Run: `node scripts/run-test-suite.mjs test-customer-page-wizard-save-route`

Run: `node scripts/run-test-suite.mjs test-demo-experience-wizard`

Expected: all PASS.

- [ ] **Step 2: 전체 웹 정적 검증을 실행한다**

Run: `npm run lint:web`

Run: `npm run typecheck:web`

Expected: both PASS. 실패 시 기존 오류와 이번 변경 오류를 경로 기준으로 분리해 기록한다.

- [ ] **Step 3: 크롬에서 1차 데스크톱·모바일 검사를 한 번에 수행한다**

크롬의 로그인 세션으로 `/page-wizard/`를 연다. 데스크톱 1440×900과 모바일 390×844에서 다음을 한 배치로 확인하고 각각 스크린샷 파일을 저장한다.

- 모든 현재 이벤트 단계가 6개 이하 작업 영역에 나타남
- 시작 설정 안에 디자인·서비스·페이지 주소가 모두 존재함
- 작업 영역 직접 이동, 이전·다음 이동, 오류 상태
- 미리보기 열기·닫기와 포커스 복원
- 모바일 목차와 하단 고정 작업 바
- 가로 스크롤, 겹침, 잘림 없음
- 관리자 생성과 기존 고객 편집 경로의 접근 상태

- [ ] **Step 4: 1차 검사에서 발견한 문제를 한 번에 수정한다**

레이아웃·대비·포커스·문구 잘림·작업 영역 상태 오류를 한 묶음으로 수정한다. 입력 필드, 저장 API, 권한 로직의 동작을 바꾸는 수정은 하지 않는다.

- [ ] **Step 5: 최종 데스크톱·모바일 확인을 한 번 수행한다**

같은 1440×900과 390×844에서 수정 사항과 핵심 이동·미리보기 동작만 재확인하고 최종 스크린샷을 저장한다. 이 확인 이후 추가 미세 조정 반복은 하지 않는다.

- [ ] **Step 6: Impeccable detector를 변경 UI에 한 번 실행한다**

Run:

```powershell
node 'C:\Users\박도영\.agents\skills\impeccable\scripts\detect.mjs' --json 'src/app/page-wizard/PageWizardWorkspace.tsx' 'src/app/page-wizard/PageWizardWorkspace.module.css' 'src/app/page-wizard/PageWizardClient.tsx' 'src/app/page-wizard/page.module.css' 'src/app/page-wizard/pageWizardEditorPanels.module.css'
```

Expected: no material findings. 발견 사항은 심각도와 이번 변경 관련성을 구분해 한 번만 수정한다. detector는 다시 실행하지 않는다.

---

### Task 7: 마감 리뷰와 디자인 시스템 기록

**Files:**
- Create or Modify: `DESIGN.md`
- Create or Modify: Impeccable design sidecar reported by the documenter
- Read: `PRODUCT.md`
- Read: `docs/superpowers/specs/2026-08-03-page-wizard-clean-workspace-redesign-design.md`

**Interfaces:**
- Consumes: 원 요청, 승인된 설계, 최종 데스크톱·모바일 스크린샷, 구현 파일, detector 결과.
- Produces: 마감 리뷰가 반영된 UI와 실제 구현 기반 `DESIGN.md`.

- [ ] **Step 1: Impeccable finish reviewer를 실행한다**

`impeccable_finish_reviewer` 서브에이전트에 다음을 전달한다.

- 원 요청: 관리자와 고객이 모든 기기에서 누락 없이 정보를 입력하는 깔끔한 화면
- 승인 내용: 6개 작업 영역, 2열 데스크톱, 단일 열 모바일, 필요 시 미리보기
- 아티팩트: `src/app/page-wizard/`
- Task 6의 최종 데스크톱·모바일 스크린샷 절대 경로
- 방향 계약: 중립적 Operate 워크스페이스, 기존 웨딩 장식 세계 거부
- detector 결과

리뷰 반환에 THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM 다섯 항목이 있는지 확인한다.

- [ ] **Step 2: 리뷰의 중대한 수정 사항을 한 번에 반영한다**

요청 범위와 기존 기능 보존 조건에 맞는 문제만 한 배치로 수정한다. 수정 후 `npm run lint:web`, `npm run typecheck:web`, `node scripts/run-test-suite.mjs test-page-wizard-workspace`를 각각 한 번 실행하고 추가 시각 탐색은 하지 않는다.

- [ ] **Step 3: Impeccable documenter로 실제 디자인 시스템을 기록한다**

`impeccable_documenter` 서브에이전트에 프로젝트 루트, `src/app/page-wizard/`, 방향 계약, `PRODUCT.md`, `C:\Users\박도영\.agents\skills\impeccable\reference\document.md`, 기록 경계가 페이지 위저드 리디자인임을 전달한다. 구현에서 실제 사용된 색상·타이포그래피·간격·제어·반응형 규칙만 `DESIGN.md`와 sidecar에 기록한다.

- [ ] **Step 4: 최종 변경과 검증 상태를 확인한다**

Run: `git diff --check`

Run: `git status --short`

Expected: 공백 오류 없음. 기존 사용자 변경 `src/app/admin/_components/AdminEventList.tsx`와 이번 작업 파일을 명확히 구분한다. 커밋·푸시·배포하지 않는다.

---

## Direction Contract

**THESIS:** 초대장 편집기는 청첩장을 흉내 낸 장식 화면이 아니라, 누락 없이 정보를 완성하는 작업 공간이다. 크림색 웨딩 카드 스택을 거부한다.

**OWN-WORLD:** 흰색·중립 회색 바탕, 짙은 먹색 글자, 파란색 단일 강조, 시스템 고딕, 1px 구분선, 6~8px 제어 반경으로 구성된 평면적 운영 UI다.

**STORY:** 사용자는 현재 위치와 남은 오류를 확인하고, 관련 정보를 한 영역에서 입력하고, 필요할 때만 미리본 뒤 안전하게 저장한다.

**FIRST VIEWPORT:** 상단 작업 바 아래 왼쪽에 6개 이하 작업 목차, 중앙에 현재 입력 영역이 보인다. 주요 다음 동작은 하단 작업 바 오른쪽에 있다.

**FORM:** Operate 모드의 반응형 편집 워크스페이스. 데스크톱은 목차와 본문의 2열, 모바일은 한 열과 목차 시트·하단 고정 동작을 사용한다.
