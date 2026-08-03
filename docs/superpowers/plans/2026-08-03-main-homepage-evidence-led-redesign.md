# Main Homepage Evidence-Led Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신규 제작 고객이 메인 첫 화면에서 서비스 가치를 이해하고 제작 문의 또는 실제 샘플로 이동하도록, 실제 제품 증거를 중심으로 홈페이지를 재구성한다.

**Architecture:** Next.js App Router의 서버 컴포넌트인 `src/app/page.tsx`에서 정적 콘텐츠와 링크 구조를 재구성하고 CSS Module에서 에디토리얼 레이아웃과 반응형을 담당한다. 기존 클라이언트 컴포넌트 `ExperienceStartButton`은 세션 생성 흐름을 보존하면서 dialog 키보드·초점 동작만 강화한다. 프레임워크 독립 정책 함수의 실제 반환 동작과 브라우저 수동 검증을 함께 사용한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, 기존 Node/tsx 테스트 러너

## Global Constraints

- 메인의 최우선 방문자는 모바일 청첩장 제작을 고민하는 신규 고객이다.
- 기존 크림 배경과 짙은 녹색을 유지하고 과도한 카드, 테두리, 그림자를 추가하지 않는다.
- 외부 제작 문의만 새 탭으로 열고 내부 링크는 같은 탭에서 이동한다.
- API, Firebase, 인증·인가, 저장 구조와 체험 세션 생성 데이터 흐름을 변경하지 않는다.
- 가격, 후기, 제작 실적처럼 검증되지 않은 주장을 추가하지 않는다.
- 새 의존성을 추가하지 않는다.
- GPT Image 2를 사용하지 않는다.
- 커밋, 푸시, 배포하지 않는다.

---

## File Map

- Modify `scripts/run-test-suite.mjs`: 홈페이지 UI 계약 테스트를 core suite에 등록한다.
- Create `scripts/test-homepage-ui-contracts.mts`: 링크 target 정책과 Esc 종료 판단의 실제 반환 동작을 검증한다.
- Create `src/app/_components/homeInteractionPolicy.ts`: 메인 링크와 체험 안내의 프레임워크 독립 정책 함수를 제공한다.
- Modify `src/app/page.tsx`: 헤더, 히어로, 제품 증거, 생애주기, 기능, 최종 CTA, 푸터의 정보 구조를 정의한다.
- Modify `src/app/page.module.css`: 데스크톱·태블릿·390px 모바일 레이아웃과 시각 위계를 구현한다.
- Modify `src/app/_components/ExperienceStartButton.tsx`: Esc 종료와 초점 이동·복귀를 구현한다.
- Modify `src/app/_components/ExperienceStartButton.module.css`: dialog 내부 버튼 최소 높이와 focus-visible 스타일을 보완한다.
- Optional Create `public/images/home-invitation-preview.png`: 기존 이미지로 제품 증거가 부족할 때만 실제 샘플 라우트의 화면 캡처를 저장한다.

### Task 1: 메인과 체험 안내의 동작 계약 추가

**Files:**
- Create: `scripts/test-homepage-ui-contracts.mts`
- Modify: `scripts/run-test-suite.mjs`
- Create: `src/app/_components/homeInteractionPolicy.ts`
- Test: `scripts/test-homepage-ui-contracts.mts`

**Interfaces:**
- Consumes: 외부 여부 boolean, keyboard key 문자열, loading boolean
- Produces: `getHomeLinkRenderProps(external: boolean)`과 `shouldDismissExperienceNotice(key: string, loading: boolean)`

- [ ] **Step 1: 실패하는 동작 테스트를 작성한다**

아직 존재하지 않는 정책 함수를 import하고 손으로 정한 기대값을 검증한다.

```ts
import {
  getHomeLinkRenderProps,
  shouldDismissExperienceNotice,
} from '@/app/_components/homeInteractionPolicy';

assert(
  JSON.stringify(getHomeLinkRenderProps(false)) === '{}',
  'internal home links must stay in the current tab.'
);
assert(
  JSON.stringify(getHomeLinkRenderProps(true)) ===
    JSON.stringify({ target: '_blank', rel: 'noreferrer' }),
  'external home links must open in a protected new tab.'
);
assert(
  shouldDismissExperienceNotice('Escape', false),
  'Escape must dismiss an idle experience notice.'
);
assert(
  !shouldDismissExperienceNotice('Escape', true) &&
    !shouldDismissExperienceNotice('Enter', false),
  'Loading or unrelated keys must not dismiss the experience notice.'
);
```

- [ ] **Step 2: 새 계약이 실패하는지 확인한다**

`test-homepage-ui-contracts`를 core suite에 등록한 뒤 실행한다.

Run: `node scripts/run-test-suite.mjs test-homepage-ui-contracts`

Expected: FAIL because `homeInteractionPolicy` does not exist.

- [ ] **Step 3: 최소 정책 구현으로 테스트를 통과시킨다**

```ts
export function getHomeLinkRenderProps(external: boolean) {
  return external ? { target: '_blank' as const, rel: 'noreferrer' } : {};
}

export function shouldDismissExperienceNotice(key: string, loading: boolean) {
  return key === 'Escape' && !loading;
}
```

Run: `node scripts/run-test-suite.mjs test-homepage-ui-contracts`

Expected: PASS with `homepage UI contract checks passed`.

### Task 2: 체험 안내의 키보드·초점 동작 보완

**Files:**
- Modify: `src/app/_components/ExperienceStartButton.tsx`
- Modify: `src/app/_components/ExperienceStartButton.module.css`
- Test: `scripts/test-project-guardrails.mts`

**Interfaces:**
- Consumes: 기존 `POST /api/experience/session`, `router.push('/experience/admin')`, `shouldDismissExperienceNotice`
- Produces: `closeNotice(): void`, trigger·dialog refs, Esc 종료와 초점 복귀 동작

- [ ] **Step 1: refs와 닫기 동작을 구현한다**

`useCallback`, `useEffect`, `useRef`를 추가하고 trigger/dialog refs 및 `closeNotice`를 정의한다.

```tsx
const triggerRef = useRef<HTMLButtonElement>(null);
const noticeRef = useRef<HTMLDivElement>(null);

const closeNotice = useCallback(() => {
  setOpen(false);
  window.requestAnimationFrame(() => triggerRef.current?.focus());
}, []);

useEffect(() => {
  if (!open) return;
  noticeRef.current?.focus();
  const handleKeyDown = (event: KeyboardEvent) => {
    if (shouldDismissExperienceNotice(event.key, loading)) closeNotice();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [closeNotice, loading, open]);
```

trigger에는 `ref={triggerRef}`를, notice에는 아래 속성을 추가한다.

```tsx
ref={noticeRef}
role="dialog"
aria-modal="true"
aria-label="체험 시작 안내"
tabIndex={-1}
```

취소 버튼은 `closeNotice`를 호출한다. 기존 fetch, 오류 문구, 라우팅은 변경하지 않는다.

- [ ] **Step 2: dialog 버튼과 초점 스타일을 보완한다**

```css
.notice:focus-visible {
  outline: 2px solid #9b6b37;
  outline-offset: 3px;
}

.noticeActions button {
  min-height: 44px;
}
```

- [ ] **Step 3: 접근성 계약과 타입을 확인한다**

Run: `node scripts/run-test-suite.mjs test-homepage-ui-contracts`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS. effect dependency warning은 다음 lint 단계에서 없어야 한다.

### Task 3: 신규 고객 중심 메인 정보 구조 구현

**Files:**
- Modify: `src/app/page.tsx`
- Test: `scripts/test-project-guardrails.mts`

**Interfaces:**
- Consumes: 기존 `/kim-shinlang-na-sinbu/romantic/`, `/my-invitations`, `/admin`, Kmong URL
- Produces: `salesHref`, `sampleHref`, `serviceSteps`, `includedFeatures`, `operationSignals` 정적 콘텐츠

- [ ] **Step 1: 링크와 콘텐츠 상수를 정리한다**

```tsx
const salesHref = 'https://kmong.com/gig/686626';
const sampleHref = '/kim-shinlang-na-sinbu/romantic/';

const operationSignals = [
  { label: '공개 상태', value: '공개 중' },
  { label: '방명록', value: '한곳에서 관리' },
  { label: '사진과 일정', value: '언제든 수정' },
] as const;
```

기존 `mainLinks` 5개 묶음을 헤더 유틸리티, 히어로 CTA, 최종 CTA로 목적별 분리한다. 샘플 항목의 기존 `href`와 `label` 객체 형태는 프로젝트 가드레일이 seed slug를 계속 검증할 수 있도록 보존한다.

- [ ] **Step 2: 헤더와 히어로를 재구성한다**

헤더는 서비스명과 두 내부 링크를 제공한다.

```tsx
<nav className={styles.headerActions} aria-label="고객 메뉴">
  <Link href="/my-invitations">내 청첩장</Link>
  <Link href="/admin">관리자</Link>
</nav>
```

히어로 CTA는 외부 제작 문의와 내부 샘플만 둔다. 외부 링크에는 보이는 `새 창` 보조 문구를 포함한다.

```tsx
<div className={styles.heroActions}>
  <a href={salesHref} target="_blank" rel="noreferrer" className={styles.primaryLink}>
    <span>제작 문의</span>
    <small>상품 안내와 상담 · 새 창</small>
  </a>
  <Link href={sampleHref} className={styles.secondaryLink}>
    <span>실제 샘플 보기</span>
    <small>하객에게 보이는 화면 확인</small>
  </Link>
</div>
```

- [ ] **Step 3: 실제 제품 증거 패널을 구성한다**

휴대폰 프레임 안에는 기존 샘플 이미지와 실제 초대장 UI임을 보여주는 날짜·이름·스크롤 힌트를 코드로 겹치고, 옆 운영 패널은 `operationSignals`를 렌더링한다. 이미지 생성 텍스트나 가짜 고객 후기는 추가하지 않는다.

- [ ] **Step 4: 생애주기·기능·최종 CTA·푸터를 구성한다**

서비스 단계는 연결된 ordered list로 유지하고, 포함 기능은 단순 목록으로 정리한다. 하단에는 제작 문의와 샘플 CTA를 반복하고 `ExperienceStartButton`을 주 CTA와 분리된 “운영 데모” 영역에 배치한다. 최소 푸터는 내 청첩장과 관리자 링크만 낮은 위계로 제공한다.

- [ ] **Step 5: 프로젝트 가드레일을 통과시킨다**

Run: `node scripts/run-test-suite.mjs test-project-guardrails`

Expected: PASS with `project guardrail checks passed`.

### Task 4: 에디토리얼 레이아웃과 반응형 구현

**Files:**
- Modify: `src/app/page.module.css`

**Interfaces:**
- Consumes: Task 3의 class names와 markup 구조
- Produces: 1180px 데스크톱, 태블릿, 760px 이하, 520px 이하 레이아웃

- [ ] **Step 1: 헤더와 히어로 시각 위계를 구현한다**

- 1180px 콘텐츠 폭, 크림 배경, 짙은 녹색 CTA를 유지한다.
- 헤더 유틸리티 링크는 텍스트 링크로 낮은 위계를 사용한다.
- 히어로는 카피와 제품 증거의 2열 구성으로 하고 과도한 box-shadow와 border-radius를 추가하지 않는다.

- [ ] **Step 2: 휴대폰과 운영 패널을 구현한다**

- 휴대폰 프레임은 실제 기기처럼 세로 비율과 얇은 외곽을 사용한다.
- 운영 패널은 카드 묶음 대신 하나의 패널 안에서 label/value 행으로 구성한다.
- 작은 상태 표시는 색상뿐 아니라 `공개 중` 텍스트를 함께 제공한다.

- [ ] **Step 3: 서비스 생애주기와 최종 CTA를 구현한다**

- 단계 목록은 번호와 연결선으로 흐름을 표현한다.
- 기능 목록은 반복 카드 대신 구분선 기반 행으로 단순화한다.
- 최종 CTA는 배경 대비를 주되 히어로 CTA보다 과장하지 않는다.

- [ ] **Step 4: 모바일 순서와 터치 영역을 구현한다**

- 760px 이하에서 히어로를 1열로 전환한다.
- 카피와 CTA 다음에 제품 증거가 바로 오도록 DOM 순서를 유지한다.
- 390px에서 헤더 링크, CTA, 운영 패널, 단계 목록이 잘리거나 가로로 넘치지 않게 한다.
- 모든 버튼과 주요 링크는 최소 44px 높이를 확보한다.

### Task 5: 정적·시각 검증

**Files:**
- Verify: `src/app/page.tsx`
- Verify: `src/app/page.module.css`
- Verify: `src/app/_components/ExperienceStartButton.tsx`
- Verify: `src/app/_components/ExperienceStartButton.module.css`

**Interfaces:**
- Consumes: Tasks 1–4의 완료된 구현
- Produces: 검증 결과와 남은 리스크 목록

- [ ] **Step 1: 관련 테스트를 실행한다**

Run: `node scripts/run-test-suite.mjs test-project-guardrails`

Expected: PASS.

- [ ] **Step 2: lint와 typecheck를 실행한다**

Run: `npm run lint:web`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

- [ ] **Step 3: Impeccable detector를 한 번 실행한다**

Run: `node C:\Users\박도영\.agents\skills\impeccable\scripts\detect.mjs --json src/app/page.tsx src/app/_components/ExperienceStartButton.tsx`

Expected: JSON findings를 검토하고 실제 문제만 수정한다. detector는 이 단계 이전에 실행하지 않는다.

- [ ] **Step 4: 실제 브라우저에서 데스크톱과 모바일을 확인한다**

- 새 탭에서 1440×1000과 390×844를 확인한다.
- 가로 overflow, H1 줄바꿈, 제품 증거의 첫 화면 노출, CTA 2개 위계, 마지막 CTA를 확인한다.
- 제작 문의는 새 탭 안내가 있고 내부 링크는 같은 탭 이동임을 확인한다.
- 운영 데모에서 안내를 열고 초점 이동, Esc 종료, 초점 복귀, 44px 버튼 높이를 확인한다.

- [ ] **Step 5: 수정 범위와 미검증 항목을 보고한다**

코드·설계 문서·계획 문서의 변경 파일, 실행한 검증, 수동 확인 범위, 남은 리스크를 한국어로 정리한다. 커밋·푸시·배포는 수행하지 않는다.
