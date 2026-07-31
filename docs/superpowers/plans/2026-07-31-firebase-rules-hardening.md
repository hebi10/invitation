# Firebase Rules Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버 공개 정책과 Firestore·Storage Rules를 일치시키고, 불완전한 노출 기간과 서버 전용 링크 토큰을 클라이언트에서 우회하지 못하도록 Emulator 테스트로 고정한다.

**Architecture:** Firestore와 Storage가 같은 노출 기간 판정을 사용한다. Rules 테스트는 운영 데이터에 접근하지 않고 `firebase emulators:exec` 안에서 fixture를 만들고 제거한다.

**Tech Stack:** Firebase Firestore Rules, Firebase Storage Rules, Firebase Emulator Suite, Firebase Admin SDK, Node.js `fetch`, `assert`, `tsx`

## Global Constraints

- Rules 권한을 넓히지 않는다.
- 정상 UI가 사용하는 공개 조회와 소유자 이미지 업로드는 유지한다.
- 운영 Firebase 프로젝트와 데이터에 접근하지 않는다.
- Rules를 배포하지 않는다.
- Firestore 문서 스키마를 변경하지 않는다.
- Storage 최대 크기는 애플리케이션 정책인 8MB와 일치시킨다.
- 커밋과 푸시는 수행하지 않는다.

---

### Task 1: Firestore 노출 기간 fail-closed 처리

**Files:**
- Modify: `scripts/test-firestore-rules-emulator.mts:1-196`
- Modify: `firestore.rules:93-123`

**Interfaces:**
- Consumes: `events/{eventId}.visibility`, `events/{eventId}.displayPeriod`
- Produces: 불완전한 활성 기간을 비공개로 판정하는 `isWithinEventDisplayPeriodData`

- [ ] **Step 1: 기간 fixture와 공개 조회 테스트 추가**

`Timestamp`를 import하고 다음 이벤트를 seed한다.

```ts
const now = Timestamp.now();
const before = Timestamp.fromMillis(now.toMillis() - 60_000);
const after = Timestamp.fromMillis(now.toMillis() + 60_000);

// active-window: startDate=before, endDate=after
// scheduled: startDate=after, endDate=after + 60_000
// expired: startDate=before - 60_000, endDate=before
// incomplete: isActive=true, startDate만 존재
// disabled-period: isActive=false, 과거 visibility 날짜가 남아 있음
```

검증 기대값은 다음과 같다.

```ts
await expectAllowed(restGet('events/active-window'), 'active display period');
await expectDenied(restGet('events/scheduled'), 'scheduled display period');
await expectDenied(restGet('events/expired'), 'expired display period');
await expectDenied(restGet('events/incomplete'), 'incomplete active display period');
await expectAllowed(restGet('events/disabled-period'), 'disabled period ignores stale dates');
```

- [ ] **Step 2: 현재 Rules에서 incomplete 이벤트가 공개되는 실패 확인**

Run: `npm run test:rules`

Expected: `incomplete active display period`가 예상과 달리 허용되어 실패한다.

- [ ] **Step 3: Firestore 기간 판정을 명시적 분기로 변경**

```rules
function isWithinEventDisplayPeriodData(data) {
  return data.displayPeriod is map
    ? (
      data.displayPeriod.isActive != true ||
      (
        data.displayPeriod.startDate is timestamp &&
        data.displayPeriod.endDate is timestamp &&
        request.time >= data.displayPeriod.startDate &&
        request.time <= data.displayPeriod.endDate
      )
    )
    : (
      !(
        data.visibility.displayStartAt is timestamp &&
        data.visibility.displayEndAt is timestamp
      ) ||
      (
        request.time >= data.visibility.displayStartAt &&
        request.time <= data.visibility.displayEndAt
      )
    );
}
```

`displayPeriod.isActive == true`인데 날짜가 하나라도 없으면 전체 식이 false가 되도록
Rules Emulator에서 확인한다.

- [ ] **Step 4: Firestore 기간 테스트 실행**

Run: `npm run test:rules`

Expected: `firestore rules emulator checks passed`

### Task 2: 보호 필드와 서버 전용 컬렉션 권한 고정

**Files:**
- Modify: `scripts/test-firestore-rules-emulator.mts`
- Modify: `firestore.rules:29-63, 160-206`

**Interfaces:**
- Produces: 소유자가 편집 가능한 필드와 서버 전용 필드의 명시적 테스트

- [ ] **Step 1: 소유자 보호 필드 테스트 추가**

소유자가 다음 변경을 시도하면 거부되는지 검사한다.

```ts
await expectDenied(restPatch('events/event-1', { ownerUid: 'owner-2' }, 'owner-1'), 'ownerUid');
await expectDenied(restPatch('events/event-1', { productTier: 'premium' }, 'owner-1'), 'productTier');
await expectDenied(restPatch('events/event-1', { ticketBalance: 99 }, 'owner-1'), 'ticketBalance');
await expectDenied(restPatch('events/event-1', { slug: 'changed' }, 'owner-1'), 'slug');
```

`events/{eventId}/content/current`의 `productTier`, `featureFlags`,
`content.productTier`, `content.features` 변경도 거부되는 fixture를 추가한다.
중첩 map을 REST PATCH body로 보낼 수 있도록 테스트 helper에 다음 분기를 추가한다.

```ts
if (value && typeof value === 'object' && !Array.isArray(value)) {
  return {
    mapValue: {
      fields: toFirestoreFields(value as Record<string, unknown>),
    },
  };
}
```

- [ ] **Step 2: slug index와 서버 전용 컬렉션 테스트 추가**

- owner가 `eventSlugIndex.eventId` 또는 문서 slug를 변경하면 거부
- 다른 고객의 slug index update/delete 거부
- 고객의 `eventSecrets`, `billingFulfillments`, `settings` read/write 거부
- 공개 방문자의 comment 직접 create 거부
- 소유자의 `events/{eventId}/linkTokens` 직접 read/write 거부

- [ ] **Step 3: 링크 토큰 직접 접근 테스트의 현재 실패 확인**

Run: `npm run test:rules`

Expected: 현재 owner에게 허용된 `linkTokens` 직접 접근 때문에 실패한다.

- [ ] **Step 4: 링크 토큰을 서버·관리자 전용으로 제한**

```rules
match /linkTokens/{tokenId} {
  allow read, write: if isAdmin();
}
```

런타임 발급·교환은 Admin SDK 기반
`src/server/repositories/eventLinkTokenRepository.ts`를 사용하므로 API 계약은
변경하지 않는다.

- [ ] **Step 5: Firestore 전체 권한 테스트 실행**

Run: `npm run test:rules`

Run: `npm run test:mobile-session-security-policy`

Expected: 모든 명령이 성공한다.

### Task 3: Storage Rules Emulator 테스트 기반 구축

**Files:**
- Create: `scripts/test-storage-rules-emulator.mts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `FIREBASE_STORAGE_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`
- Produces: Storage upload, download, list, delete REST helper

- [ ] **Step 1: Storage Emulator REST helper 작성**

기존 Firestore Rules 테스트의 unsigned emulator JWT 생성 방식을 재사용하고 다음
helper를 작성한다.

```ts
function storageObjectUrl(path: string) {
  return `http://${storageHost}/v0/b/${bucket}/o/${encodeURIComponent(path)}`;
}
async function upload(path: string, body: Uint8Array, contentType: string, uid?: string) {
  return fetch(
    `http://${storageHost}/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    { method: 'POST', headers: authHeaders(uid, contentType), body }
  );
}
async function download(path: string, uid?: string) {
  return fetch(`${storageObjectUrl(path)}?alt=media`, { headers: authHeaders(uid) });
}
async function remove(path: string, uid?: string) {
  return fetch(storageObjectUrl(path), { method: 'DELETE', headers: authHeaders(uid) });
}
```

- [ ] **Step 2: Firestore fixture를 함께 seed**

테스트 시작 시 Admin SDK로 다음을 만든다.

- 활성 관리자와 비활성 관리자
- 공개, 비공개, 노출 전, 노출 종료, 불완전 기간 이벤트
- ownerUid가 다른 이벤트
- active 상태의 `eventSlugIndex`
- 공개·비공개 memory page

- [ ] **Step 3: Storage 허용·차단 시나리오 작성**

- 공개 이벤트 이미지 익명 download 허용
- 비공개·기간 밖·불완전 기간 이미지 익명 download 거부
- owner download/list/upload/delete 허용
- 다른 고객의 list/upload/delete 거부
- 활성 관리자 허용, 비활성 관리자 거부
- memory image는 공개 download만 허용하고 write는 관리자만 허용
- `text/plain` 업로드 거부
- 8MB 이하 이미지 허용, 8MB 초과 이미지 거부

- [ ] **Step 4: package script 등록**

```json
"test:storage-rules": "firebase emulators:exec --only firestore,storage \"npx --yes tsx --conditions react-server scripts/test-storage-rules-emulator.mts\""
```

- [ ] **Step 5: 현재 Storage Rules 테스트 실행**

Run: `npm run test:storage-rules`

Expected: 불완전한 기간 또는 8MB 초과 이미지가 현재 허용되어 실패한다.

### Task 4: Storage 공개 기간과 용량 정책 일치

**Files:**
- Modify: `storage.rules:22-65, 93-99`
- Test: `scripts/test-storage-rules-emulator.mts`

**Interfaces:**
- Produces: Firestore Rules와 같은 공개 기간 판정
- Produces: `request.resource.size <= 8 * 1024 * 1024`

- [ ] **Step 1: Storage 기간 판정을 명시적 분기로 변경**

`isWithinEventDisplayPeriod(eventId)`를 Task 1의 Firestore 분기와 같은 의미로
작성한다. `displayPeriod.isActive == true`인데 날짜가 불완전하면 false,
`isActive != true`이면 true가 되어야 한다.

- [ ] **Step 2: Storage 이미지 크기를 애플리케이션 정책과 일치**

```rules
function isImageWriteRequest() {
  return request.resource != null &&
    request.resource.size <= 8 * 1024 * 1024 &&
    request.resource.contentType.matches('image/.*');
}
```

- [ ] **Step 3: Storage Rules 테스트 실행**

Run: `npm run test:storage-rules`

Expected: 모든 공개 기간, 권한, MIME, 크기 시나리오가 성공한다.

- [ ] **Step 4: Rules 통합 검증**

Run: `npm run test:rules`

Run: `npm run test:storage-rules`

Run: `npm run test:public-access-block-reasons`

Expected: 서버 공개 정책과 두 Rules 테스트가 모두 성공한다.

### Task 5: Rules 단계 최종 확인

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Rules 통합 스크립트 추가**

```json
"test:rules:all": "npm run test:rules && npm run test:storage-rules"
```

- [ ] **Step 2: 코드와 Rules의 공개 기간 명칭 교차 확인**

Run: `rg -n "displayPeriod|displayStartAt|displayEndAt" src/lib/invitationPublicAccess.ts firestore.rules storage.rules`

Expected: 활성 기간의 불완전 데이터는 서버와 Rules 모두 비공개로 처리한다.

- [ ] **Step 3: 최종 Rules 검증**

Run: `npm run test:rules:all`

Run: `npm run typecheck:web`

Expected: 모든 명령이 성공한다.

- [ ] **Step 4: 배포하지 않았음을 확인**

`firebase deploy`, `npm run deploy:firebase`, Firebase Console 변경을 실행하지 않는다.
