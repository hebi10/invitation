# Wedding Theme Quality Hardening Implementation Plan

> **승인 근거:** 2026-08-03 네 테마 감사 결과 전체를 순서대로 반영하라는 사용자 요청.

**Goal:** Emotional, Romantic, Simple, Classic-R 모바일 청첩장의 접근성, 대비, 조작성, 성능, 모션 대응을 기존 데이터 계약과 시각적 정체성을 보존하며 개선한다.

**Architecture:** 공통 섹션의 접근성 동작은 재사용 가능한 유틸리티와 명시적 ARIA 계약으로 만들고, 테마 차이는 CSS 변수와 테마 루트 속성에서 정의한다. 고정 로딩 지연과 레이아웃 애니메이션은 제거하고, 이미지·폰트·SDK는 필요 시점에 가깝게 로드한다.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules, Node 기반 회귀 테스트

**Global constraints:** 관리자·페이지 위저드 변경 보존, 공개 라우트/API/저장 스키마 유지, 새 의존성 금지, 커밋·푸시·배포 금지.

---

### Task 1: 접근성 회귀 테스트 추가

**Files:**
- Create: `scripts/test-wedding-theme-accessibility.mts`
- Modify: `scripts/run-test-suite.mjs`

- [x] 갤러리 dialog/focus 계약, 방명록 label/live region, 일정 tab 계약을 검사한다.
- [x] 새 테스트를 단독 실행해 현재 구현에서 실패함을 확인한다.

### Task 2: 갤러리와 방명록 접근성 구현

**Files:**
- Modify: `src/components/sections/Gallery/GalleryGridShared.tsx`
- Modify: `src/app/_components/themeRenderers/romantic.tsx`
- Modify: `src/components/sections/Guestbook/GuestbookThemed.tsx`
- Test: `scripts/test-wedding-theme-accessibility.mts`

- [x] 썸네일을 이름 있는 버튼으로 바꾸고 문맥 있는 대체 텍스트를 사용한다.
- [x] 공통·Romantic 라이트박스에 dialog 의미, 포커스 진입/트랩/복귀, Escape 처리를 추가한다.
- [x] 방명록 label 연결과 status/alert를 추가한다.
- [x] 테스트를 통과시킨다.

### Task 3: 일정 탭과 모바일 조작성 구현

**Files:**
- Modify: `src/components/sections/Schedule/ScheduleThemed.tsx`
- Modify: related wedding theme CSS modules
- Test: `scripts/test-wedding-theme-accessibility.mts`

- [x] 일정에 tablist/tab/tabpanel 관계와 키보드 이동을 구현한다.
- [x] 연락·지도 토글·복사·갤러리 버튼의 터치 영역을 44px 이상으로 맞춘다.
- [x] Classic 활성 탭 상태가 명확히 보이게 한다.

### Task 4: 색 대비와 스타일 계약 구현

**Files:**
- Create: `scripts/test-wedding-theme-style-contracts.mts`
- Modify: Emotional/Romantic/Classic theme CSS modules
- Modify: relevant shared section CSS modules
- Modify: `scripts/run-test-suite.mjs`

- [x] 새 스타일 계약 테스트를 실패시킨다.
- [x] 장식 색과 텍스트 색을 분리해 일반 텍스트 대비를 4.5:1 이상으로 맞춘다.
- [x] Classic 상태 선택자는 ARIA/테마 계약을 기준으로 정리한다.
- [x] 긴 이름과 문구의 줄바꿈 내구성을 추가한다.

### Task 5: 로딩·이미지·폰트·SDK 성능 개선

**Files:**
- Create: `scripts/test-wedding-theme-performance.mts`
- Modify: wedding loader components and theme renderers
- Modify: `src/components/sections/Cover/CoverFramedThemed.tsx`
- Modify: `src/app/_components/EventInvitationLayout.tsx`
- Modify: Romantic CSS module
- Create: optimized sample WebP asset
- Modify: `src/config/sampleInvitationDefaults.ts`
- Modify: `scripts/run-test-suite.mjs`

- [x] 성능 계약 테스트를 실패시킨다.
- [x] 고정 최소 로딩 시간을 제거하고 진행 막대를 transform 기반으로 바꾼다.
- [x] 갤러리 지연 로딩과 반응형 이미지 크기 정보를 추가한다.
- [x] Romantic 외부 폰트 import를 제거한다.
- [x] Kakao SDK를 인터랙션 이후 로드한다.
- [x] 샘플 이미지를 WebP로 변환해 참조하고 크기 감소를 확인한다.

### Task 6: 감소 모션과 테마 루트 보강

**Files:**
- Modify: wedding theme CSS modules
- Modify: wedding theme renderer roots
- Test: `scripts/test-wedding-theme-style-contracts.mts`

- [x] 반복 모션과 전환별 reduced-motion 규칙을 추가한다.
- [x] Romantic·Classic 토큰을 로더까지 포함하는 루트로 이동한다.
- [x] `transition: all`과 레이아웃 속성 애니메이션을 변경 범위에서 구체 속성/transform으로 교체한다.

### Task 7: 통합 검증과 브라우저 QA

**Files:**
- Verify only

- [x] 신규 테스트와 기존 웨딩 테마 테스트를 실행한다.
- [x] `npm test`, 타입체크, ESLint, 프로덕션 빌드를 실행한다.
- [x] 네 공개 라우트를 390px/1440px에서 확인한다.
- [x] 키보드 라이트박스, 일정 탭, 모바일 터치 영역, 가로 넘침, 이미지 오류, 콘솔 오류를 확인한다.
