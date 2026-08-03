# Customer Self-Claim Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 생성한 초대장 URL을 받은 고객이 명시적으로 편집을 시작하여 페이지를 자신의 계정에 안전하게 연결하고 편집하게 한다.

**Architecture:** 서버의 소유권 정책을 순수 함수로 분리하고, Firestore 트랜잭션 기반 선점 저장소 메서드를 고객 API에서 호출한다. 페이지 위저드는 `claimable` 상태에서 선점 버튼을 보여주고 성공 후 기존 소유자 편집 흐름을 재사용한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Firebase Admin/Firestore, Node assert 기반 스크립트 테스트

## Global Constraints

- 페이지 생성은 관리자만 가능하다.
- 고객의 URL 열람만으로 소유권을 변경하지 않는다.
- 고객 간 소유권 덮어쓰기를 허용하지 않는다.
- 커밋, 푸시, 배포는 실행하지 않는다.

---

### Task 1: 고객 선점 정책과 원자적 저장

**Files:**
- Create: `src/server/customerEventClaimPolicy.ts`
- Modify: `src/server/repositories/eventRepository.ts`
- Test: `scripts/test-customer-event-self-claim.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Produces: `resolveCustomerEventClaimState(currentOwnerUid, claimantUid, adminUserIds)`
- Produces: `firestoreEventRepository.claimOwnerBySlug(input)`

- [ ] **Step 1: Write the failing policy test**

소유자 없음과 관리자 소유는 `claimable`, 동일 고객은 `owner`, 다른 고객은 `different-owner`가 되는 실제 순수 함수 호출 테스트를 작성한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/run-test-suite.mjs test-customer-event-self-claim`
Expected: 새 정책 모듈을 찾지 못해 실패한다.

- [ ] **Step 3: Implement policy and transaction**

정책 함수를 구현하고 이벤트 문서를 트랜잭션에서 다시 읽어 허용된 기존 소유자일 때만 고객 정보를 기록한다.

- [ ] **Step 4: Run focused test**

Run: `node scripts/run-test-suite.mjs test-customer-event-self-claim`
Expected: PASS

### Task 2: 고객 선점 API와 편집 가능 상태

**Files:**
- Modify: `src/server/customerEventsService.ts`
- Modify: `src/app/api/customer/events/[slug]/ownership/route.ts`
- Modify: `src/services/customerEventService.ts`
- Test: `scripts/test-customer-event-self-claim.mts`

**Interfaces:**
- Produces: `claimCustomerEventOwnership(ownerUid, pageSlug)`
- Produces: `claimCustomerEventForCurrentAccount(pageSlug)`

- [ ] **Step 1: Extend the failing test**

고객 선점 API가 인증 UID로 서버 선점 서비스를 호출하고, 서비스가 관리자 계정 요청과 다른 고객 소유 페이지를 거절하는 계약을 추가한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/run-test-suite.mjs test-customer-event-self-claim`
Expected: POST 및 선점 서비스가 없어 실패한다.

- [ ] **Step 3: Implement the minimal API flow**

기존 ownership route에 POST를 추가하고 인증 사용자의 이메일/표시 이름을 조회하여 트랜잭션 선점 메서드에 전달한다.

- [ ] **Step 4: Run focused tests**

Run: `node scripts/run-test-suite.mjs test-customer-event-self-claim`
Expected: PASS

### Task 3: 페이지 위저드 선점 화면 연결

**Files:**
- Modify: `src/app/page-wizard/PageWizardClient.tsx`
- Modify: `src/app/page-wizard/pageWizardCopy.ts`
- Modify: `src/app/page-wizard/pageWizardPresentation.ts`
- Test: `scripts/test-customer-event-self-claim.mts`

**Interfaces:**
- Consumes: `claimCustomerEventForCurrentAccount(pageSlug)`

- [ ] **Step 1: Extend the failing UI contract test**

선점 화면에 명시적 버튼과 클라이언트 선점 호출이 연결되는지 검사한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/run-test-suite.mjs test-customer-event-self-claim`
Expected: 버튼과 호출이 없어 실패한다.

- [ ] **Step 3: Implement the claim interaction**

선점 버튼 클릭 중 중복 요청을 막고, 성공 시 기존 편집 쿼리를 무효화하여 편집 화면으로 전환한다. 충돌은 기존 오류 안내 영역에 표시한다.

- [ ] **Step 4: Run focused tests**

Run: `node scripts/run-test-suite.mjs test-customer-event-self-claim`
Expected: PASS

### Task 4: 통합 검증

**Files:**
- Verify only

- [ ] **Step 1: Run relevant suites**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run static checks**

Run: `npm run typecheck:web`
Expected: PASS

Run: `npm run lint:web`
Expected: PASS

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS

