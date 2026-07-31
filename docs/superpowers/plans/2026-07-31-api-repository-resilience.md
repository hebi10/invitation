# API and Repository Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firestore 접근 경계, 민감 API 레이트리밋, 고객 제작권 보상, 결제 이행 잠금, 이미지 검증을 실제 실패 시나리오로 고정한다.

**Architecture:** Route와 Service는 저장소 구현을 직접 알지 않고 Repository 인터페이스를 사용한다. 테스트는 선택적 의존성 주입으로 실패 순서를 재현하고, 운영 기본값은 기존 Firestore Repository를 그대로 사용한다.

**Tech Stack:** Next.js 15, TypeScript, Firebase Admin Firestore, Firebase Emulator, Sharp, Node.js `assert`, `tsx`

## Global Constraints

- API 성공 응답과 기존 URL을 변경하지 않는다.
- Firestore 문서 구조와 컬렉션 이름을 변경하지 않는다.
- 새 외부 의존성을 추가하지 않는다.
- 레이트리밋 운영 정책을 완화하지 않는다.
- 결제 중복 실행을 허용하는 방향으로 수정하지 않는다.
- 커밋, 푸시, 배포는 수행하지 않는다.

---

### Task 1: API·Server Firestore 경계 검사 강화

**Files:**
- Modify: `scripts/test-api-repository-boundary.mts:5-25`
- Modify: `scripts/test-service-repository-boundary.mts:6-31`

**Interfaces:**
- Produces: API와 Server에서 허용된 Repository 외 Firestore 접근을 차단하는 정적 검사

- [ ] **Step 1: 우회 import를 재현하는 검사 케이스 추가**

`FORBIDDEN_PATTERNS`에 다음 패턴을 추가한다.

```ts
{
  label: 'firebase-admin firestore import',
  pattern: /from\s+['"]firebase-admin\/firestore['"]/,
},
{
  label: 'firebase client firestore import',
  pattern: /from\s+['"]firebase\/firestore['"]/,
},
```

`src/server/firebaseAdmin.ts`와 `src/server/repositories/**`만 기존
`ALLOWED_PREFIXES`로 허용한다.

- [ ] **Step 2: 경계 검사 실행**

Run: `npm run test:api-repository-boundary`

Run: `npm run test:service-repository-boundary`

Expected: 현재 허용된 Repository 경계만 사용하므로 두 명령이 성공한다. 실패하면
해당 파일을 먼저 Repository로 이동한 뒤 다음 단계로 진행한다.

- [ ] **Step 3: 이벤트 쓰기 경계와 함께 확인**

Run: `npm run test:event-write-paths`

Expected: legacy 컬렉션 쓰기가 없어 성공한다.

### Task 2: 레이트리밋 저장 실패의 실제 fail-closed 테스트

**Files:**
- Modify: `src/server/requestRateLimit.ts:12-18, 65-76, 215-263`
- Modify: `scripts/test-rate-limit-policy.mts`

**Interfaces:**
- Produces: `applyRateLimit(options, dependencies?)`
- Produces: `ApplyRateLimitDependencies.repository`, `nodeEnv`

- [ ] **Step 1: 저장소 실패 테스트 추가**

`scripts/test-rate-limit-policy.mts`에 다음 세 경우를 추가한다.

```ts
const failingRepository = {
  isAvailable: () => true,
  apply: async () => { throw new Error('store unavailable'); },
};

assert.equal(
  (await applyRateLimit(
    { key: 'mobile-billing-fulfill:user', limit: 3, windowMs: 60_000 },
    { repository: failingRepository, nodeEnv: 'production' }
  )).allowed,
  false
);
assert.equal(
  (await applyRateLimit(
    { key: 'mobile-billing-fulfill:user', limit: 3, windowMs: 60_000 },
    { repository: failingRepository, nodeEnv: 'development' }
  )).allowed,
  true
);
assert.equal(
  (await applyRateLimit(
    { key: 'kakao-local-address-search:user', limit: 3, windowMs: 60_000 },
    { repository: failingRepository, nodeEnv: 'production' }
  )).allowed,
  true
);
```

- [ ] **Step 2: 테스트 실행으로 현재 직접 Repository 의존성을 확인**

Run: `npm run test:rate-limit-policy`

Expected: `applyRateLimit`이 두 번째 인자를 받지 않아 타입 또는 실행 단계에서
실패한다.

- [ ] **Step 3: 선택적 의존성 주입 추가**

```ts
type RateLimitRepositoryLike = {
  isAvailable(): boolean;
  apply(options: RateLimitOptions): Promise<RateLimitResult>;
};
type ApplyRateLimitDependencies = {
  repository?: RateLimitRepositoryLike;
  nodeEnv?: string;
};

export async function applyRateLimit(
  options: RateLimitOptions,
  dependencies: ApplyRateLimitDependencies = {}
) {
  const repository =
    dependencies.repository ?? firestoreRateLimitRepository;
  const shouldFailClosed = shouldFailClosedRateLimit({
    key: options.key,
    nodeEnv: dependencies.nodeEnv,
  });
  // 기존 저장소 호출과 local fallback을 repository와 shouldFailClosed로 치환한다.
}
```

운영 기본 호출은 기존 Repository와 `process.env.NODE_ENV`를 사용한다.

- [ ] **Step 4: 레이트리밋 검증**

Run: `npm run test:rate-limit-policy`

Run: `npm run typecheck:web`

Expected: 저장 실패 시 민감 운영 scope만 차단되고 모든 명령이 성공한다.

### Task 3: 고객 제작권 차감 보상 흐름 테스트

**Files:**
- Modify: `src/server/customerWalletServerService.ts:133-198`
- Create: `scripts/test-customer-wallet-compensation.mts`
- Modify: `package.json`

**Interfaces:**
- Produces: `createCustomerInvitationPageFromWalletCredit(input, dependencies?)`
- Produces: 테스트 가능한 `CustomerPageCreationDependencies`

- [ ] **Step 1: 성공·실패 순서 테스트 작성**

의존성 대역이 호출 문자열을 배열에 기록하도록 만들고 다음을 검증한다.

```ts
assert.deepEqual(successCalls, ['debit', 'create', 'assign']);
assert.deepEqual(createFailureCalls, ['debit', 'create', 'refund']);
assert.deepEqual(assignFailureCalls, ['debit', 'create', 'assign', 'cleanup', 'refund']);
assert.deepEqual(cleanupFailureCalls, ['debit', 'create', 'assign', 'cleanup', 'refund']);
```

각 실패 시 원래 생성 또는 소유권 할당 오류가 호출자에게 다시 전달되는지도
`assert.rejects`로 확인한다.

- [ ] **Step 2: 테스트 실행으로 직접 구현 의존성을 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-customer-wallet-compensation.mts`

Expected: 현재 함수가 테스트 의존성을 받을 수 없어 실패한다.

- [ ] **Step 3: 기본 동작을 보존하는 선택적 의존성 추가**

```ts
type CustomerPageCreationDependencies = {
  adjustBalance: typeof firestoreCustomerWalletRepository.adjustBalance;
  createDraft: typeof createServerInvitationPageDraftFromSeed;
  assignOwner: typeof firestoreEventRepository.assignOwnerBySlug;
  cleanupDraft: typeof deleteAdminEventBySlug;
};

const defaultDependencies: CustomerPageCreationDependencies = {
  adjustBalance: (input) =>
    firestoreCustomerWalletRepository.adjustBalance(input),
  createDraft: createServerInvitationPageDraftFromSeed,
  assignOwner: (input) =>
    firestoreEventRepository.assignOwnerBySlug(input),
  cleanupDraft: deleteAdminEventBySlug,
};
```

함수 내부 직접 호출을 `dependencies`로 치환한다. 보상 순서와 사용자 메시지는
변경하지 않는다.

- [ ] **Step 4: 보상 테스트와 기존 고객 생성 정책 검증**

Run: `npx --yes tsx --conditions react-server scripts/test-customer-wallet-compensation.mts`

Run: `npm run test:customer-page-wizard-save-route`

Expected: 두 명령이 성공한다.

- [ ] **Step 5: package script 등록**

```json
"test:customer-wallet-compensation": "npx --yes tsx --conditions react-server scripts/test-customer-wallet-compensation.mts"
```

### Task 4: 결제 이행 잠금의 동시 요청 차단

**Files:**
- Modify: `src/server/repositories/billingFulfillmentRepository.ts:22-31, 93-135`
- Modify: `src/server/mobileBillingServerService.ts:277-424`
- Create: `scripts/test-billing-fulfillment-lock.mts`
- Modify: `package.json`

**Interfaces:**
- Produces: `BillingFulfillmentLockResult`
- Changes internally: `BillingFulfillmentRepository.acquireLock()` return type
- Consumes: 기존 `BillingFulfillmentRecord`

- [ ] **Step 1: Firestore Emulator 동시 잠금 테스트 작성**

```ts
const [first, second] = await Promise.all([
  firestoreBillingFulfillmentRepository.acquireLock(purchase, 'pageCreation'),
  firestoreBillingFulfillmentRepository.acquireLock(purchase, 'pageCreation'),
]);
assert.equal([first, second].filter((result) => result.acquired).length, 1);
assert.equal(first.record.transactionId, purchase.transactionId);
assert.equal(second.record.transactionId, purchase.transactionId);
```

다른 `appUserId` 또는 `productId`로 같은 `transactionId`를 요청하면 거부되는
기존 동작도 검사한다.

- [ ] **Step 2: Emulator 테스트를 실행해 두 요청 모두 처리 권한을 얻는 현 상태 확인**

Run: `firebase emulators:exec --only firestore "npx --yes tsx --conditions react-server scripts/test-billing-fulfillment-lock.mts"`

Expected: `acquired` 구분이 없어 실패한다.

- [ ] **Step 3: 잠금 결과 타입과 transaction 판정 추가**

```ts
export type BillingFulfillmentLockResult = {
  record: BillingFulfillmentRecord;
  acquired: boolean;
};
```

- 신규 문서 생성: `acquired: true`
- `failed`에서 `processing`으로 재시도 전환: `acquired: true`
- 기존 `processing` 또는 `fulfilled`: `acquired: false`
- 다른 사용자나 상품에 연결된 transaction: 기존처럼 오류

- [ ] **Step 4: 결제 Service가 잠금 소유자만 부수 효과를 실행하도록 수정**

`fulfillServerMobilePageCreationPurchase`와
`fulfillServerMobileTicketPackPurchase`에서 `lock.record`를 사용한다.

```ts
if (!lock.acquired && lock.record.status === 'fulfilled') {
  return existingFulfillmentResponse;
}
if (!lock.acquired && lock.record.status === 'processing') {
  if (lock.record.createdPageSlug) {
    return existingPageResponse;
  }
  throw new Error('This purchase is already being processed.');
}
```

잠금을 얻지 못한 요청은 draft 생성이나 티켓 증가를 실행하지 않는다. API 응답
스키마는 변경하지 않는다.

- [ ] **Step 5: Emulator 및 모바일 결제 정책 검증**

Run: `firebase emulators:exec --only firestore "npx --yes tsx --conditions react-server scripts/test-billing-fulfillment-lock.mts"`

Run: `npm run test:mobile-device-id-and-billing-policy`

Run: `npm run typecheck:web`

Expected: 모든 명령이 성공한다.
- [ ] **Step 6: package script 등록**

```json
"test:billing-fulfillment-lock": "firebase emulators:exec --only firestore \"npx --yes tsx --conditions react-server scripts/test-billing-fulfillment-lock.mts\""
```

### Task 5: 서버 이미지 실데이터 검증 회귀 테스트

**Files:**
- Modify: `src/server/editableImageUploadService.ts:236-303`
- Create: `scripts/test-editable-image-upload-validation.mts`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateServerSideImagePayload(file, buffer, assetKind)`
- Consumes: 기존 `EditableImageUploadError`

- [ ] **Step 1: 유효 이미지와 위장·비정상 이미지 테스트 작성**

Sharp로 300×300 JPEG를 만든 뒤 다음을 검사한다.

```ts
assert.doesNotThrow(() =>
  validateServerSideImagePayload(validFile, validBuffer, 'gallery')
);
assert.throws(
  () => validateServerSideImagePayload(mimeMismatchFile, validBuffer, 'gallery'),
  EditableImageUploadError
);
assert.throws(
  () => validateServerSideImagePayload(textFile, Buffer.from('not-an-image'), 'gallery'),
  EditableImageUploadError
);
assert.throws(
  () => validateServerSideImagePayload(extremeRatioFile, extremeRatioBuffer, 'cover'),
  EditableImageUploadError
);
```

- [ ] **Step 2: 테스트를 실행해 validator가 비공개라 import할 수 없음을 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-editable-image-upload-validation.mts`

Expected: export가 없어 실패한다.

- [ ] **Step 3: validator를 export하되 런타임 로직은 변경하지 않음**

```ts
export function validateServerSideImagePayload(
  file: File,
  buffer: Buffer,
  assetKind: EditableImageAssetKind
) {
  // 기존 본문 유지
}
```

- [ ] **Step 4: 이미지 검증 실행**

Run: `npx --yes tsx --conditions react-server scripts/test-editable-image-upload-validation.mts`

Run: `npm run test:image-upload-optimization`

Run: `npm run test:admin-owner-image-upload-routing`

Expected: 모든 명령이 성공한다.

- [ ] **Step 5: package script 등록**

```json
"test:editable-image-upload-validation": "npx --yes tsx --conditions react-server scripts/test-editable-image-upload-validation.mts"
```

### Task 6: API·Repository 단계 통합 검증

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 통합 스크립트 추가**

```json
"test:api-resilience": "npm run test:api-repository-boundary && npm run test:service-repository-boundary && npm run test:event-write-paths && npm run test:rate-limit-policy && npm run test:customer-wallet-compensation && npm run test:billing-fulfillment-lock && npm run test:editable-image-upload-validation"
```

- [ ] **Step 2: 통합 검증**

Run: `npm run test:api-resilience`

Run: `npm run lint:web`

Run: `npm run typecheck:web`

Expected: 모든 명령이 성공한다.
