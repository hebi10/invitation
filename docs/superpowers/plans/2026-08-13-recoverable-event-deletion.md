# Recoverable Event Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 이벤트 완전 삭제를 단계별 checkpoint, 중복 요청 방지, 실패 재시도, 접근 차단을 갖춘 복구 가능한 작업으로 전환한다.

**Architecture:** `adminEventDeletionService`가 작업 상태 전이와 단계 실행을 조정하고 `adminEventDeletionRepository`가 Firestore 트랜잭션, checkpoint, 컬렉션별 멱등 삭제를 담당한다. 이벤트 루트에는 선택적 `deletion` 메타데이터를 두고, 서버 전용 `eventDeletionJobs` 문서가 장기 작업 상태를 보존한다. API와 관리자 gateway는 기존 DELETE 흐름을 유지하면서 작업 결과와 retry 동작을 확장한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Firebase Admin/Firestore/Storage, Node `assert` 기반 테스트 러너

## Global Constraints

- 새로운 외부 큐나 런타임 의존성을 추가하지 않는다.
- 공개 route와 기존 성공 응답의 핵심 구조를 유지한다.
- `deletion` 메타데이터가 없는 기존 이벤트는 정상 이벤트로 처리한다.
- 클라이언트가 `eventDeletionJobs`를 직접 읽거나 쓰지 못하게 한다.
- 모든 동작 변경은 실패하는 테스트를 먼저 실행해 확인한다.
- 한국어 사용자 문구와 UTF-8 인코딩을 유지한다.

---

## File Structure

- `src/server/repositories/adminEventDeletionRepository.ts`: 삭제 작업 저장, 트랜잭션, checkpoint, 멱등 삭제 단계
- `src/server/adminEventDeletionService.ts`: 단계 orchestration, 재시도 가능성 분류, 안전한 결과 모델
- `src/server/eventDeletionPolicy.ts`: 삭제 메타데이터 판독과 공개·편집 차단 정책
- `src/app/api/admin/events/[slug]/route.ts`: 최초 삭제 및 retry 요청 라우팅
- `src/services/adminEventService.ts`: 관리자 DELETE 응답 정규화
- `src/app/admin/_hooks/adminDataGateway.ts`: 삭제 작업 결과 반환 인터페이스
- `src/app/admin/_hooks/useAdminData.ts`: 진행·실패·재시도 상태와 toast
- `src/app/admin/_components/AdminEventDetailPanel.tsx`: 삭제 상태 표시와 위험 작업 비활성화
- `src/types/invitationPage.ts`: 관리자 summary에 전달되는 선택적 삭제 메타데이터 타입
- `src/server/repositories/eventReadThroughDtos.ts`: 저장 데이터에서 삭제 메타데이터 판독
- `src/server/adminInvitationPagesService.ts`: 관리자 summary에 삭제 상태 전달
- `src/lib/invitationPublicAccess.ts`: 삭제 중 공개 차단
- 고객·모바일 편집 서버 경계: 삭제 중 저장과 소유권 변경 차단
- `firestore.rules`: 서버 전용 작업 컬렉션 deny-by-default 명시
- `scripts/test-admin-event-deletion-policy.mts`: 순수 정책과 orchestration 단위 테스트
- `scripts/test-admin-event-deletion-ui-contracts.mts`: UI·gateway 계약 테스트
- `scripts/test-admin-event-deletion-emulator.mts`: Firestore 중복·checkpoint·재시도·잔존 데이터 테스트
- `scripts/run-test-suite.mjs`: 신규 테스트 등록

---

### Task 1: 삭제 상태 정책과 타입

**Files:**
- Create: `src/server/eventDeletionPolicy.ts`
- Modify: `src/types/invitationPage.ts`
- Modify: `src/server/repositories/eventReadThroughDtos.ts`
- Modify: `src/server/adminInvitationPagesService.ts`
- Create: `scripts/test-admin-event-deletion-policy.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Produces: `EventDeletionMetadata`, `EventDeletionJobStatus`, `EventDeletionStep`
- Produces: `readEventDeletionMetadata(value: unknown): EventDeletionMetadata | null`
- Produces: `isEventDeletionBlockingAccess(metadata): boolean`

- [ ] **Step 1: Write the failing policy test**

테스트에 정상 이벤트, `pending`, `running`, `failed`, 잘못된 입력을 추가한다. `pending|running|failed`만 접근을 차단하고 기존 데이터의 누락은 허용한다고 단언한다.

- [ ] **Step 2: Run the test and verify RED**

Run: `node node_modules/tsx/dist/cli.mjs --conditions react-server scripts/test-admin-event-deletion-policy.mts`

Expected: `eventDeletionPolicy` 모듈을 찾지 못해 실패한다.

- [ ] **Step 3: Implement the minimal policy and DTO mapping**

```ts
export type EventDeletionStep =
  | 'block-access'
  | 'delete-comments'
  | 'delete-images'
  | 'delete-ownership-references'
  | 'delete-content-and-indexes'
  | 'delete-event-root';

export type EventDeletionMetadata = {
  jobId: string;
  status: 'pending' | 'running' | 'failed';
  currentStep: EventDeletionStep;
  requestedAt: string;
  retryable?: boolean;
};
```

DTO 판독은 잘못된 상태를 `null`로 정규화하고 관리자 `InvitationPageSummary`에 선택적으로 전달한다.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- test-admin-event-deletion-policy`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `이벤트 삭제 상태 정책 추가`

### Task 2: 작업 저장소와 멱등 checkpoint

**Files:**
- Modify: `src/server/repositories/adminEventDeletionRepository.ts`
- Create: `scripts/test-admin-event-deletion-emulator.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Produces: `beginEventDeletion(pageSlug, requestedBy): Promise<EventDeletionJob | null>`
- Produces: `markEventDeletionStepRunning(jobId, step): Promise<void>`
- Produces: `completeEventDeletionStep(jobId, step): Promise<void>`
- Produces: `failEventDeletionStep(jobId, step, errorCode, retryable): Promise<void>`
- Produces: `completeEventDeletionJob(jobId): Promise<void>`
- Produces: `runEventDeletionRepositoryStep(job, step): Promise<DeleteStepResult>`
- Produces: `getEventDeletionJobBySlug(pageSlug): Promise<EventDeletionJob | null>`
- Produces: `claimFailedEventDeletionJob(pageSlug, requestedBy): Promise<EventDeletionJob | null>`

- [ ] **Step 1: Write emulator tests for transaction and checkpoint behavior**

동일 slug 동시 요청이 하나의 활성 작업만 만들고 같은 job ID를 반환하는지, 실패 checkpoint 이후 완료 단계가 보존되는지, 이미 없는 문서 삭제가 성공하는지 검증한다.

- [ ] **Step 2: Run emulator test and verify RED**

Run: `firebase emulators:exec --project demo-invitation-rules --only firestore,storage "node scripts/run-test-suite.mjs test-admin-event-deletion-emulator"`

Expected: 새 repository 함수가 없어 실패한다.

- [ ] **Step 3: Implement transaction-backed job creation**

`eventDeletionJobs/{jobId}`와 `events/{eventId}.deletion`을 한 트랜잭션에서 기록한다. 기존 활성 job이 있으면 새 문서를 만들지 않는다. job ID는 이벤트 ID와 요청 nonce를 서버에서 생성하고 클라이언트 입력을 사용하지 않는다.

실패 작업 재시도는 별도 트랜잭션에서 `failed` 상태 확인과 `running` 실행권 획득을 함께 수행한다. 같은 작업의 동시 재시도 중 하나만 실행권을 얻고, 나머지는 삭제 단계를 실행하지 않는다.

- [ ] **Step 4: Split existing deletion into named idempotent steps**

재귀 삭제, event secret, slug index, billing reference 삭제를 단계 함수로 재배치한다. 문서 부재를 성공으로 처리하고 이벤트 루트는 모든 선행 checkpoint 이후에만 삭제한다.

- [ ] **Step 5: Run emulator test and verify GREEN**

Run: Task 2 Step 2와 동일.

Expected: PASS, 완료 후 event, secret, slug index, billing reference, 하위 컬렉션이 남지 않는다.

- [ ] **Step 6: Commit**

Commit message: `이벤트 삭제 작업 저장소 추가`

### Task 3: 삭제 orchestration과 안전한 오류 모델

**Files:**
- Modify: `src/server/adminEventDeletionService.ts`
- Modify: `scripts/test-admin-event-deletion-policy.mts`

**Interfaces:**
- Consumes: Task 2 repository interfaces
- Produces: `requestAdminEventDeletion(pageSlug, requestedBy): Promise<AdminEventDeletionResult | null>`
- Produces: `retryAdminEventDeletion(pageSlug, requestedBy): Promise<AdminEventDeletionResult | null>`

- [ ] **Step 1: Write failing orchestration tests**

의존성을 주입한 실제 step runner로 순서 실행, 완료 단계 skip, 일시 오류의 `retryable: true`, 데이터 불일치의 `retryable: false`, 원본 예외 미노출을 검증한다.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- test-admin-event-deletion-policy`

Expected: 새 orchestration API가 없어 실패한다.

- [ ] **Step 3: Implement the step runner**

고정된 `EVENT_DELETION_STEPS`를 순회하고 실행 전 running, 성공 후 checkpoint, 실패 시 정규화된 error code를 저장한다. 결과는 `success`, `deletionJobId`, `deletionStatus`, `failedStep`, `retryable`만 노출한다.

재시도는 읽기 전용 job 조회로 정상·진행·완료 작업을 거절하고, 실패 작업은 repository의 transactional claim을 얻은 경우에만 runner를 시작한다.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- test-admin-event-deletion-policy`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `이벤트 삭제 재시도 흐름 추가`

### Task 4: 관리자 API와 클라이언트 gateway 연결

**Files:**
- Modify: `src/app/api/admin/events/[slug]/route.ts`
- Modify: `src/services/adminEventService.ts`
- Modify: `src/app/admin/_hooks/adminDataGateway.ts`
- Create: `scripts/test-admin-event-deletion-ui-contracts.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: Task 3 service API
- Produces: `AdminDataGateway.deleteEvent(slug, { retry?: boolean }): Promise<AdminEventDeletionResult>`

- [ ] **Step 1: Write failing route and gateway contract tests**

DELETE body의 `{ retry: true }`, 관리자 UID 전달, 기존 성공 필드 보존, 404, 안전한 500, gateway 결과 반환을 검증한다.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- test-admin-event-deletion-ui-contracts`

Expected: gateway가 `void`를 반환하고 retry 입력을 지원하지 않아 실패한다.

- [ ] **Step 3: Implement API request parsing and response mapping**

`verifyAdminRequest` 결과의 UID를 service에 전달한다. retry가 아니면 최초 요청, retry면 기존 failed job 재개만 허용한다. 체험 gateway는 기존 즉시 삭제 결과를 `completed`로 정규화한다.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- test-admin-event-deletion-ui-contracts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `관리자 삭제 작업 API 연결`

### Task 5: 공개·편집·소유권 접근 차단

**Files:**
- Modify: `src/lib/invitationPublicAccess.ts`
- Modify: `src/server/invitationPageServerService.ts`
- Modify: `src/server/customerEventsService.ts`
- Modify: `src/server/clientEditorMobileApi.ts`
- Modify: `src/server/eventOwnershipInviteService.ts`
- Modify: `scripts/test-public-access-block-reasons.mts`
- Modify: `scripts/test-admin-event-deletion-policy.mts`

**Interfaces:**
- Consumes: `isEventDeletionBlockingAccess`
- Produces: public reason `deleting` 또는 기존 비공개 응답으로의 안전한 매핑

- [ ] **Step 1: Add failing access tests**

삭제 중 공개 조회는 방문자에게 열리지 않고, 고객·모바일 저장과 소유권 변경은 사용자용 conflict 응답으로 거절되며 관리자의 삭제 재시도 조회는 가능함을 검증한다.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- test-public-access-block-reasons`

Run: `npm test -- test-admin-event-deletion-policy`

Expected: 삭제 상태가 현재 접근 판단에 반영되지 않아 실패한다.

- [ ] **Step 3: Implement policy checks at server boundaries**

공개 데이터 DTO가 삭제 상태를 전달하도록 하고 공개 접근 판단 전에 차단한다. 고객·모바일 편집 및 소유권 mutation은 공통 정책 함수로 동일하게 거절한다.

- [ ] **Step 4: Run focused tests and verify GREEN**

Task 5 Step 2 명령을 다시 실행한다.

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `삭제 진행 이벤트 접근 차단`

### Task 6: 관리자 진행·실패·재시도 UI

**Files:**
- Modify: `src/app/admin/_hooks/useAdminData.ts`
- Modify: `src/app/admin/_components/AdminEventDetailPanel.tsx`
- Modify: `src/app/admin/_components/AdminEventList.tsx`
- Modify: `src/app/admin/_components/AdminEventMobileList.tsx`
- Modify: `src/app/admin/_components/StatusBadge.tsx`
- Modify: `src/app/admin/_components/AdminUi.module.css`
- Modify: `scripts/test-admin-event-deletion-ui-contracts.mts`

**Interfaces:**
- Consumes: `InvitationPageSummary.deletion`, gateway deletion result
- Produces: 진행 중 비활성화, 실패 안내, `삭제 다시 시도`

- [ ] **Step 1: Write failing UI contract tests**

진행 상태의 라벨과 `aria-live`, 공개·등급·연결·편집·중복 삭제 비활성화, 실패 상태의 재시도 버튼, 완료 시 목록 제거와 성공 toast를 검증한다.

- [ ] **Step 2: Run the UI contract test and verify RED**

Run: `npm test -- test-admin-event-deletion-ui-contracts`

Expected: 삭제 상태 UI와 retry handler가 없어 실패한다.

- [ ] **Step 3: Implement minimal UI state**

기존 웜 그래파이트 토큰과 평면 스타일을 사용한다. 진행 중에는 상태 badge와 설명을 표시하고 위험 작업 외 mutation도 비활성화한다. 실패 상태는 일반화된 문구와 재시도 버튼만 제공한다.

- [ ] **Step 4: Run the UI contract test and verify GREEN**

Run: `npm test -- test-admin-event-deletion-ui-contracts`

Expected: PASS.

- [ ] **Step 5: Run Impeccable detector once for changed UI targets**

Run: `node C:\Users\박도영\.agents\skills\impeccable\scripts\detect.mjs --json src/app/admin/_components src/app/admin/_hooks/useAdminData.ts`

Expected: 새 P0/P1 디자인 규칙 위반 없음.

- [ ] **Step 6: Commit**

Commit message: `관리자 삭제 진행 상태 UI 추가`

### Task 7: 보안 규칙과 통합 회귀 검증

**Files:**
- Modify: `firestore.rules`
- Modify: `scripts/test-firestore-rules-emulator.mts`
- Modify: `scripts/test-security-hardening.mts`

**Interfaces:**
- Consumes: `eventDeletionJobs` 컬렉션과 이벤트 `deletion` 메타데이터
- Produces: 클라이언트 직접 접근 불가 규칙

- [ ] **Step 1: Write failing rules tests**

anonymous, owner, 일반 인증 사용자, disabled admin이 작업 문서를 읽거나 쓰지 못하고, enabled admin도 클라이언트 SDK로 작업 상태를 위조하지 못하도록 검증한다. 서버 Admin SDK 경로는 Rules 영향을 받지 않는다.

- [ ] **Step 2: Run emulator rule test and verify RED**

Run: `firebase emulators:exec --project demo-invitation-rules --only firestore "node scripts/run-test-suite.mjs test-firestore-rules-emulator"`

Expected: 명시적 작업 컬렉션 계약 검사 또는 이벤트 deletion 필드 위조 방지가 없어 실패한다.

- [ ] **Step 3: Harden Firestore rules**

`eventDeletionJobs/{jobId}`를 명시적으로 deny하고 일반 고객 update가 이벤트 `deletion` 필드를 만들거나 바꾸지 못하도록 affected keys 검사를 추가한다.

- [ ] **Step 4: Run complete relevant verification**

Run: `npm run test:security`

Run: `npm run test:architecture`

Run: `npm run typecheck:web`

Run: `npm run lint:web`

Run: `npm run build`

Run: `npm run test:emulator`

Expected: 모두 PASS. 실패 시 기존 오류와 이번 변경 오류를 분리해 기록한다.

- [ ] **Step 5: Browser QA**

관리자 인증 가능한 환경에서 데스크톱과 390px 모바일로 진행·실패·재시도 상태, 키보드 포커스, `aria-live`, 완료 후 목록 갱신을 확인한다. 인증 환경이 없으면 체험 gateway에 동일 상태 fixture를 추가하지 말고 미검증 사유로 보고한다.

- [ ] **Step 6: Commit**

Commit message: `이벤트 삭제 작업 보안 검증`

---

## Plan Self-Review

- 설계의 중복 요청, checkpoint, 재시도, 공개·편집 차단, UI 상태, 보안, 잔존 데이터 검증이 각각 Task 2–7에 매핑된다.
- 외부 큐, 신규 의존성, 저장 schema 강제 마이그레이션은 포함하지 않는다.
- `pending_delete`는 댓글 상태로 유지하고 이벤트 삭제에는 `deletion.status`를 사용해 의미 충돌을 피한다.
- 이벤트 루트 삭제는 마지막 단계로 고정돼 부분 실패 후 작업 문서가 남는다.
