# Customer Ownership Invite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 만든 미연결 이벤트를 7일 만료·1회용 링크로 인증된 고객 계정에 자동 연결하고 즉시 편집기로 이동시킨다.

**Architecture:** 관리자 신규 생성은 클라이언트 Repository에 명시적인 미연결 생성 의도를 전달한다. 연결 링크는 `events/{eventId}/ownershipInvites/current`에 토큰 해시만 저장하고, 서버 Repository 트랜잭션이 발급·상태 확인·소비와 소유권 이전을 담당한다. 관리자 UI는 링크 발급 결과를 일회성 대화상자로 보여주고, 고객 `/connect/{slug}` 화면은 URL fragment의 토큰을 메모리에서만 사용해 인증·이메일 확인 후 교환한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, TanStack Query 5, Firebase Auth, Firestore Admin SDK, Firebase Emulator, 기존 CSS Modules

## Global Constraints

- 연결 토큰은 32바이트 base64url 원문이며 Firestore에는 SHA-256 해시만 저장한다.
- 연결 링크 유효 기간은 발급 시점부터 정확히 7일이고 한 번만 사용할 수 있다.
- 재발급은 `ownershipInvites/current`를 덮어써 이전 링크를 즉시 폐기한다.
- 원본 토큰은 query string, localStorage, sessionStorage, 쿠키, Firestore, 서버 로그에 남기지 않는다.
- 관리자 신규 생성만 미연결로 만들고 고객 제작권·모바일 생성의 기존 소유권 연결은 유지한다.
- 기존 관리자 소유 이벤트는 링크 교환 시 고객에게 이전하고 일반 고객 소유 이벤트는 이전하지 않는다.
- 운영 데이터 일괄 마이그레이션, 새 외부 의존성, 커밋, 푸시, 배포를 하지 않는다.
- 기존 관리자 UI 컴포넌트·색상·간격·반응형 패턴을 우선 재사용한다.
- 각 동작 변경은 실패 테스트를 먼저 실행한 뒤 최소 구현으로 통과시킨다.

---

## File Structure

### 신규 파일

- `src/services/repositories/clientEventOwnershipPolicy.ts`: 관리자 생성 시 현재 인증 사용자를 소유자로 초기화할지 결정하는 순수 정책.
- `src/server/eventOwnershipInvitePolicy.ts`: 토큰 생성·해시·만료·상태 판정 순수 정책과 공유 타입.
- `src/server/repositories/eventOwnershipInviteRepository.ts`: Firestore 초대 문서와 이벤트 소유권을 트랜잭션으로 처리.
- `src/server/eventOwnershipInviteService.ts`: 관리자 발급, 공개 상태 확인, 인증 고객 교환 업무 흐름.
- `src/app/api/admin/events/[slug]/ownership-invite/route.ts`: 관리자 링크 발급 API.
- `src/app/api/connect/events/[slug]/ownership-invite-status/route.ts`: 비로그인 링크 상태 확인 API.
- `src/app/api/customer/events/[slug]/ownership-invite/route.ts`: 인증 고객 링크 교환 API.
- `src/services/eventOwnershipInviteService.ts`: 세 API를 호출하는 브라우저 서비스.
- `src/app/admin/_components/AdminOwnershipInviteDialog.tsx`: 원본 링크를 발급 직후만 표시하는 관리자 대화상자.
- `src/app/connect/[slug]/ConnectOwnershipClient.tsx`: fragment 토큰, 인증, 이메일 확인, 자동 교환 상태를 관리.
- `src/app/connect/[slug]/page.tsx`: 연결 페이지 진입점.
- `src/app/connect/layout.tsx`: 인증·React Query provider와 noindex 메타데이터.
- `src/app/connect/connect.module.css`: 기존 인증 화면 톤을 따르는 연결 화면 레이아웃.
- `scripts/test-admin-created-event-ownership.mts`: 관리자 생성 미연결 정책 회귀 테스트.
- `scripts/test-event-ownership-invite-policy.mts`: 토큰과 상태 정책 단위 테스트.
- `scripts/test-event-ownership-invite-emulator.mts`: 발급·재발급·소비·동시성·이전 Firestore 통합 테스트.
- `scripts/test-event-ownership-invite-routes.mts`: 관리자·고객·공개 API 경계와 연결 화면 정적 회귀 테스트.

### 수정 파일

- `src/services/repositories/clientEventRepositoryCore.ts`: 소유권 초기화 플래그를 순수 정책에 전달.
- `src/services/repositories/invitationPageRepository.ts`: `saveConfig`에 소유권 초기화 옵션 추가.
- `src/services/invitationPageService.ts`: 관리자 신규 초안 저장 시 미연결 옵션 전달, 관리자 요약의 소유권 상태 정규화.
- `src/server/adminInvitationPagesService.ts`: 이벤트 소유자가 관리자·고객·미연결인지 계산해 관리자 API에 제공.
- `src/server/customerAuthVerification.ts`: 이벤트 연결에도 재사용할 인증 완료 정책과 문구 제공.
- `src/app/admin/_components/AdminPagesTab.tsx`: 페이지 소유권 상태와 링크 발급 버튼 표시.
- `src/app/admin/_components/AdminCustomerAccountsTab.tsx`: 미연결 선택 및 관리자 소유 이벤트에 링크 발급 작업 추가.
- `src/app/admin/_components/index.ts`: 신규 대화상자 export.
- `src/app/admin/_hooks/useAdminData.ts`: 링크 발급 mutation과 오류 토스트 추가.
- `src/app/admin/AdminPageClient.tsx`: 공용 링크 대화상자 상태와 두 탭 콜백 연결.
- `src/app/admin/page.module.css`: 링크 대화상자와 상태 행의 기존 관리자 스타일 확장.
- `scripts/test-firestore-rules-emulator.mts`: 관리자·소유자·익명 모두의 직접 접근 거부 검증.
- `scripts/test-admin-api-auth.mts`: 신규 관리자 발급 라우트 인증 검증.
- `scripts/test-customer-auth-route-policy.mts`: 신규 고객 교환 라우트가 공통 인증 경계를 쓰는지 검증.
- `package.json`: 네 개의 신규 테스트와 에뮬레이터 테스트 스크립트 등록.
- `README.md`, `docs/service-repository-boundary.md`: 실제 연결 링크 경계와 고객 흐름 반영.

---

### Task 1: 관리자 신규 이벤트를 미연결 상태로 생성

**Files:**
- Create: `src/services/repositories/clientEventOwnershipPolicy.ts`
- Create: `scripts/test-admin-created-event-ownership.mts`
- Modify: `src/services/repositories/clientEventRepositoryCore.ts:40-70,400-475,616-650`
- Modify: `src/services/repositories/invitationPageRepository.ts:35-55,185-210`
- Modify: `src/services/invitationPageService.ts:576-630`
- Modify: `package.json`

**Interfaces:**
- Produces: `resolveNextClientEventOwner(input): ClientEventOwnerFields`.
- Produces: `initializeOwnerFromCurrentAuth?: boolean` on client summary/content/config writes.
- Preserves: existing `ownerUid`, `ownerEmail`, `ownerDisplayName` before considering any initialization option.

- [ ] **Step 1: Write the failing ownership policy test**

```ts
import assert from 'node:assert/strict';
import { resolveNextClientEventOwner } from '../src/services/repositories/clientEventOwnershipPolicy.ts';

const admin = { uid: 'admin-1', email: 'admin@example.com', displayName: '관리자' };

assert.deepEqual(
  resolveNextClientEventOwner({
    existingEventFound: false,
    existing: null,
    requested: null,
    currentAuthOwner: admin,
    initializeOwnerFromCurrentAuth: false,
  }),
  { ownerUid: null, ownerEmail: null, ownerDisplayName: null }
);

assert.equal(
  resolveNextClientEventOwner({
    existingEventFound: true,
    existing: { ownerUid: 'customer-1', ownerEmail: null, ownerDisplayName: null },
    requested: null,
    currentAuthOwner: admin,
    initializeOwnerFromCurrentAuth: false,
  }).ownerUid,
  'customer-1'
);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-created-event-ownership.mts`

Expected: FAIL because `clientEventOwnershipPolicy.ts` and `resolveNextClientEventOwner` do not exist.

- [ ] **Step 3: Implement the pure ownership policy**

```ts
export function resolveNextClientEventOwner(input: {
  existingEventFound: boolean;
  existing: ClientEventOwnerFields | null;
  requested: ClientEventOwnerFields | null;
  currentAuthOwner: ClientEventOwnerFields | null;
  initializeOwnerFromCurrentAuth: boolean;
}): ClientEventOwnerFields {
  if (input.existingEventFound) {
    return input.existing ?? { ownerUid: null, ownerEmail: null, ownerDisplayName: null };
  }
  if (input.requested?.ownerUid) return input.requested;
  if (input.initializeOwnerFromCurrentAuth && input.currentAuthOwner?.ownerUid) {
    return input.currentAuthOwner;
  }
  return { ownerUid: null, ownerEmail: null, ownerDisplayName: null };
}
```

- [ ] **Step 4: Thread the explicit option through the existing repositories**

Add `initializeOwnerFromCurrentAuth?: boolean` to `ClientEventSummaryWriteInput`,
`saveClientEventContentBySlug`, and `ClientInvitationPageRepository.saveConfig`. Replace the three
independent `nextOwner*` expressions with the pure policy result. Pass `Boolean(existingSummary)` as
`existingEventFound` so a previously created 미연결 이벤트의 명시적 `null` 소유권도 이후
registry·노출 기간 저장에서 보존한다.
`createInvitationPageDraftFromSeed`, pass `initializeOwnerFromCurrentAuth: false`; all existing save
and customer/mobile server paths keep their prior behavior.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run:

```powershell
npx --yes tsx --conditions react-server scripts/test-admin-created-event-ownership.mts
npm run test:event-write-paths
npm run test:customer-page-wizard-save-route
```

Expected: all PASS, and the new test proves existing owners remain unchanged.

---

### Task 2: 토큰·만료·상태 정책 구현

**Files:**
- Create: `src/server/eventOwnershipInvitePolicy.ts`
- Create: `scripts/test-event-ownership-invite-policy.mts`
- Modify: `package.json`

**Interfaces:**
- Produces: `OWNERSHIP_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000`.
- Produces: `createOwnershipInviteToken(): string` and `hashOwnershipInviteToken(token): string`.
- Produces: `getOwnershipInviteStatus(record, token, now): 'valid' | 'expired' | 'consumed' | 'invalid'`.
- Produces: `EventOwnershipInviteRecord` and public status response types.

- [ ] **Step 1: Write failing policy tests**

```ts
const token = 'known-token';
const now = new Date('2026-08-03T00:00:00.000Z');
const active = {
  tokenHash: hashOwnershipInviteToken(token),
  status: 'active' as const,
  expiresAt: new Date(now.getTime() + OWNERSHIP_INVITE_TTL_MS),
  createdAt: now,
  createdByUid: 'admin-1',
  consumedAt: null,
  consumedByUid: null,
};

assert.equal(getOwnershipInviteStatus(active, token, now), 'valid');
assert.equal(getOwnershipInviteStatus(active, 'wrong', now), 'invalid');
assert.equal(getOwnershipInviteStatus(active, token, active.expiresAt), 'expired');
assert.equal(getOwnershipInviteStatus({ ...active, status: 'consumed' }, token, now), 'consumed');
assert.equal(Buffer.from(createOwnershipInviteToken(), 'base64url').byteLength, 32);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx --yes tsx --conditions react-server scripts/test-event-ownership-invite-policy.mts`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement minimal crypto and status policy**

Use only `node:crypto` `randomBytes`, `createHash`, and `timingSafeEqual`. Reject empty or malformed
tokens before comparison. Treat `now >= expiresAt` as expired and check the token hash before
returning consumed/expired so invalid callers do not learn a valid invite's lifecycle.

- [ ] **Step 4: Run the policy test and verify GREEN**

Run: `npx --yes tsx --conditions react-server scripts/test-event-ownership-invite-policy.mts`

Expected: PASS with no token printed to stdout.

---

### Task 3: Firestore 발급·재발급·소비 트랜잭션 구현

**Files:**
- Create: `src/server/repositories/eventOwnershipInviteRepository.ts`
- Create: `src/server/eventOwnershipInviteService.ts`
- Create: `scripts/test-event-ownership-invite-emulator.mts`
- Modify: `package.json`

**Interfaces:**
- Produces: `issueEventOwnershipInvite({ pageSlug, createdByUid, now? })`.
- Produces: `inspectEventOwnershipInvite({ pageSlug, token, now? })`.
- Produces: `consumeEventOwnershipInvite({ pageSlug, token, customer, now? })`.
- Consumes: `resolveStoredEventBySlug`, `getServerFirestore`, `isServerAdminUserEnabled` only through
  focused repository/service boundaries.

- [ ] **Step 1: Write emulator integration tests before repository code**

Seed four events: unassigned, administrator-owned, customer-owned, and missing. Assert:

```ts
const first = await issueEventOwnershipInvite({ pageSlug: 'unassigned', createdByUid: 'admin-1', now });
assert.equal(first.expiresAt.getTime(), now.getTime() + OWNERSHIP_INVITE_TTL_MS);

const stored = await db.doc(`events/event-unassigned/ownershipInvites/current`).get();
assert.notEqual(stored.get('tokenHash'), first.token);

const second = await issueEventOwnershipInvite({ pageSlug: 'unassigned', createdByUid: 'admin-1', now });
assert.equal((await inspectEventOwnershipInvite({ pageSlug: 'unassigned', token: first.token, now })).status, 'invalid');
assert.equal((await inspectEventOwnershipInvite({ pageSlug: 'unassigned', token: second.token, now })).status, 'valid');

await consumeEventOwnershipInvite({
  pageSlug: 'unassigned',
  token: second.token,
  customer: { uid: 'customer-1', email: 'one@example.com', displayName: '고객' },
  now,
});
assert.equal((await db.doc('events/event-unassigned').get()).get('ownerUid'), 'customer-1');
```

Also assert administrator-owned transfer succeeds, ordinary customer-owned issue/consume fails,
expired and consumed links fail, and two simultaneous consume calls produce exactly one success.

- [ ] **Step 2: Run emulator test and verify RED**

Run:

```powershell
firebase emulators:exec --project demo-invitation-rules --only firestore "npx --yes tsx --conditions react-server scripts/test-event-ownership-invite-emulator.mts"
```

Expected: FAIL because repository/service modules do not exist.

- [ ] **Step 3: Implement repository transactions**

The repository resolves slug to event ID, then uses `db.runTransaction`. Every transaction reads the
event, invite, and current owner `admin-users/{ownerUid}` document before any writes. Issue and
consume allow `ownerUid == null` or an enabled administrator; an existing same customer is idempotent;
an ordinary different customer throws a typed conflict. Consume updates the event owner fields and
the invite consumed fields in the same transaction.

- [ ] **Step 4: Implement the service boundary**

The service generates raw tokens, calls the repository with token hashes, builds
`/connect/{encodeURIComponent(slug)}#token={encodeURIComponent(rawToken)}`, and never logs or returns
the hash. Define typed service errors with `status` and safe Korean messages for missing, expired,
consumed, invalid, and different-owner states.

- [ ] **Step 5: Run emulator and policy tests and verify GREEN**

Run the Task 2 policy test followed by the Task 3 emulator command. Expected: all PASS and only one
concurrent consume succeeds.

---

### Task 4: 관리자·공개·고객 API와 브라우저 서비스 구현

**Files:**
- Create: `src/app/api/admin/events/[slug]/ownership-invite/route.ts`
- Create: `src/app/api/connect/events/[slug]/ownership-invite-status/route.ts`
- Create: `src/app/api/customer/events/[slug]/ownership-invite/route.ts`
- Create: `src/services/eventOwnershipInviteService.ts`
- Create: `scripts/test-event-ownership-invite-routes.mts`
- Modify: `src/server/customerAuthVerification.ts`
- Modify: `scripts/test-admin-api-auth.mts`
- Modify: `scripts/test-customer-auth-route-policy.mts`
- Modify: `package.json`

**Interfaces:**
- Admin response: `{ success: true, slug, url, expiresAt }`.
- Public status response: `{ success: true, status, slug, displayName: string | null }` with display
  name populated only when the supplied token matches the current invite.
- Customer response: `{ success: true, slug, eventId }`.
- Client functions: `issueAdminOwnershipInvite`, `inspectOwnershipInvite`,
  `consumeCustomerOwnershipInvite`.

- [ ] **Step 1: Write failing route boundary tests**

Assert the admin route calls `verifyAdminRequest`, the customer route calls
`verifyCustomerRequest`, and the public status route does not import Firebase Admin Auth directly or
mutate ownership. Assert all routes use safe error mapping and `cache-control: no-store`.

- [ ] **Step 2: Run route tests and verify RED**

Run: `npx --yes tsx --conditions react-server scripts/test-event-ownership-invite-routes.mts`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement verification policy reuse**

Rename the creation-only internal concept to an exported generic
`canUseVerifiedCustomerFeatures(decodedToken)` and retain
`canCreateCustomerOwnedInvitation` as a compatibility wrapper. Use the generic function in ownership
invite consumption and keep the existing trusted Google/Apple provider behavior.

- [ ] **Step 4: Implement API routes with scoped limits**

- Admin issue: 10 requests per 10 minutes keyed by admin UID and slug.
- Public status: 20 requests per 10 minutes keyed by slug and request fingerprint.
- Customer consume: 5 requests per 10 minutes keyed by verified UID and slug.
- Parse token only from JSON request bodies; do not include it in error logs or rate-limit key parts.

- [ ] **Step 5: Implement client service**

Use `getCurrentFirebaseIdToken({ forceRefresh: true })` for customer consume and the existing admin
header pattern for issue. Normalize dates and status strings; throw safe Korean errors for non-2xx
responses. Do not store raw tokens outside the returned function value.

- [ ] **Step 6: Run route/auth tests and verify GREEN**

Run:

```powershell
npx --yes tsx --conditions react-server scripts/test-event-ownership-invite-routes.mts
npm run test:admin-api-auth
npm run test:customer-auth-route-policy
npm run test:customer-api-auth
```

Expected: all PASS.

---

### Task 5: 관리자 페이지 소유권 상태와 링크 발급 UI 구현

**Files:**
- Create: `src/app/admin/_components/AdminOwnershipInviteDialog.tsx`
- Modify: `src/server/adminInvitationPagesService.ts`
- Modify: `src/services/invitationPageService.ts`
- Modify: `src/app/admin/_components/AdminPagesTab.tsx`
- Modify: `src/app/admin/_components/AdminCustomerAccountsTab.tsx`
- Modify: `src/app/admin/_components/index.ts`
- Modify: `src/app/admin/_hooks/useAdminData.ts`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `src/app/admin/page.module.css`
- Modify: `scripts/test-event-ownership-invite-routes.mts`

**Interfaces:**
- Produces: `ownershipKind: 'unassigned' | 'admin' | 'customer'` on admin page summaries.
- Produces: `onIssueOwnershipInvite(pageSlug): Promise<AdminOwnershipInviteResult | null>`.
- Dialog consumes the one-time result and supports copy, reissue, and close without persistence.

- [ ] **Step 1: Extend the failing UI contract test**

Assert admin summaries expose `ownershipKind`, both admin tabs render `고객 연결 링크`, and the
dialog includes `navigator.clipboard.writeText` without local/session storage usage. Assert customer-owned
pages do not render an enabled issue action.

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npx --yes tsx --conditions react-server scripts/test-event-ownership-invite-routes.mts`

Expected: FAIL on missing ownership summary and UI components.

- [ ] **Step 3: Add server-derived ownership kind**

Fetch enabled administrator IDs with event summaries. Map empty owner to `unassigned`, enabled admin
owner to `admin`, and every other non-empty owner to `customer`. Return only the kind to the browser;
do not expose owner UID or email in page summaries.

- [ ] **Step 4: Add admin mutation and shared dialog state**

`useAdminData` calls `issueAdminOwnershipInvite` and returns the one-time result. `AdminPageClient`
owns the open dialog result so the pages tab and customer accounts tab share one dialog. Reissue asks
for existing overlay confirmation, replaces the visible link, and announces success by toast.

- [ ] **Step 5: Add actions to both admin tabs**

- Page list: show an ownership badge and issue button only for `unassigned` or `admin`.
- Customer accounts: show issue next to a selected unassigned event and for an event linked to an
  administrator account; ordinary customer-linked events retain only edit/preview/clear actions.
- Use existing `admin-button` variants and avoid adding hover-only discoverability.

- [ ] **Step 6: Implement accessible invite dialog**

Use `role="dialog"`, `aria-modal="true"`, a labeled readonly link input, explicit copy/reissue/close
buttons, Escape close, focus placement, and the existing admin backdrop. Show the absolute Korean date
and the warning that only the latest link works.

- [ ] **Step 7: Run targeted contract and type tests and verify GREEN**

Run the route/UI contract test and `npm run typecheck:web`. Expected: PASS.

---

### Task 6: 고객 연결·회원가입·인증·자동 이동 화면 구현

**Files:**
- Create: `src/app/connect/layout.tsx`
- Create: `src/app/connect/[slug]/page.tsx`
- Create: `src/app/connect/[slug]/ConnectOwnershipClient.tsx`
- Create: `src/app/connect/connect.module.css`
- Modify: `scripts/test-event-ownership-invite-routes.mts`

**Interfaces:**
- Consumes: `inspectOwnershipInvite(slug, token)` and
  `consumeCustomerOwnershipInvite(slug, token)`.
- Consumes: `useAdmin()` auth state, `FirebaseAuthLoginCard`, verification resend/refresh, logout.
- Produces: success navigation to `/page-wizard/{slug}` with no token.

- [ ] **Step 1: Extend the failing UI contract test**

Assert the connection client reads `window.location.hash`, never reads/writes browser storage, renders
`FirebaseAuthLoginCard`, handles unverified users, and calls `router.replace` with the token-free
wizard path.

- [ ] **Step 2: Run the contract test and verify RED**

Expected: FAIL because the connect route is missing.

- [ ] **Step 3: Implement route providers and metadata**

Wrap connect children in `AuthenticatedAppProviders`; set `robots: { index: false, follow: false }`
and a mobile viewport. The server page validates and decodes slug only; it never receives the fragment.

- [ ] **Step 4: Implement the client state machine**

Use these explicit states:

```ts
type ConnectState =
  | 'reading-link'
  | 'checking-link'
  | 'login-required'
  | 'verification-required'
  | 'connecting'
  | 'expired'
  | 'consumed'
  | 'invalid'
  | 'different-owner'
  | 'error';
```

Read the fragment once into React state. Inspect it before showing auth. When the user is verified,
guard automatic consume with a ref keyed by UID+slug+token hash-in-memory marker so React Strict Mode
does not submit twice. On success call `router.replace('/page-wizard/' + encodeURIComponent(slug))`.

- [ ] **Step 5: Implement authentication and verification panels**

- Logged out: existing `FirebaseAuthLoginCard` with login/register/Google.
- Logged in but unverified: account email, resend verification, refresh status, and logout.
- Verified: progress state while auto-consuming.
- Invalid lifecycle states: distinct Korean heading, recovery copy, and `/my-invitations` link.

- [ ] **Step 6: Implement responsive styling using incumbent visual truth**

Reuse global/auth colors and typography. Keep one centered operation card, readable 44px-or-larger
actions, visible focus, no hover dependency, and no new decorative shadows or rounding beyond the
existing authentication card treatment.

- [ ] **Step 7: Run UI contract and typecheck and verify GREEN**

Run:

```powershell
npx --yes tsx --conditions react-server scripts/test-event-ownership-invite-routes.mts
npm run typecheck:web
```

Expected: PASS.

---

### Task 7: Firestore Rules와 보안 회귀 테스트 보강

**Files:**
- Modify: `scripts/test-firestore-rules-emulator.mts`
- Modify: `scripts/test-security-hardening.mts`

**Interfaces:**
- Preserves: Admin SDK server access.
- Enforces: no direct browser read/create/update/delete on
  `events/{eventId}/ownershipInvites/{inviteId}` for anonymous, owner, or administrator identities.

- [ ] **Step 1: Add direct-access characterization assertions**

Seed `events/event-1/ownershipInvites/current` through Admin SDK, then assert REST get, patch, and
delete are denied for anonymous, `owner-1`, and `admin-1`.

- [ ] **Step 2: Run rules test and characterize the existing boundary**

Run: `npm run test:rules`

Expected: PASS because unmatched event subcollections already fall through to the global deny rule.
This is a characterization test for an existing security boundary, not a behavior change.

- [ ] **Step 3: Keep Rules unchanged when the characterization passes**

Do not add a redundant nested rule. Extend `test-security-hardening` to assert that no
`ownershipInvites` client allow rule is introduced and that the server repository remains the only
write path.

- [ ] **Step 4: Run rules and security tests and verify GREEN**

Run:

```powershell
npm run test:rules
npm run test:security-hardening
```

Expected: PASS.

---

### Task 8: 문서·전체 회귀·브라우저 검증

**Files:**
- Modify: `README.md`
- Modify: `docs/service-repository-boundary.md`
- Modify: `package.json`

**Interfaces:**
- Documents: administrator create → issue fragment link → customer auth/verification → transaction
  consume → token-free wizard redirect.
- Registers: `test:admin-created-event-ownership`, `test:ownership-invite-policy`,
  `test:ownership-invite-routes`, `test:ownership-invite-emulator`.

- [ ] **Step 1: Update package scripts and architecture documentation**

Add the three fast tests to `test:stability:fast`; keep the emulator invite test in
`test:stability:emulator`. Document that customer self-claim is possible only with the server-issued
single-use link and never with an arbitrary unassigned slug.

- [ ] **Step 2: Run focused fast verification**

Run:

```powershell
npm run test:admin-created-event-ownership
npm run test:ownership-invite-policy
npm run test:ownership-invite-routes
npm run test:admin-customer-assignment-filters
npm run test:customer-page-wizard-save-route
npm run test:event-write-paths
npm run test:admin-api-auth
npm run test:customer-api-auth
npm run test:customer-auth-route-policy
npm run typecheck:web
npm run lint:web
```

Expected: all PASS without warnings introduced by this feature.

- [ ] **Step 3: Run emulator verification**

Run:

```powershell
npm run test:ownership-invite-emulator
npm run test:rules
```

Expected: all PASS, including single-use concurrency and direct access denial.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Next.js build completes and all new routes are listed. This command regenerates `.next`
through the existing `clean:next` script; report that generated output handling in the final summary.

- [ ] **Step 5: Run bounded browser QA with the Browser skill**

Start `next dev` without `clean:next`, then verify in one desktop/mobile pass:

1. 관리자 페이지의 미연결·관리자 소유 상태와 링크 발급 대화상자.
2. 복사 후 재발급 시 표시 링크 변경.
3. `/connect/{slug}#token=...` 로그아웃 화면.
4. 이메일 미인증 화면의 재전송·상태 확인 동작.
5. 인증 고객 자동 연결 후 토큰 없는 위저드 이동.
6. 만료·사용 완료·타 고객 소유 오류 문구.

인증된 운영 데이터 접근이 불가능하면 상태별 자동 테스트와 비로그인 화면까지만 확인하고,
확인하지 못한 인증 UI를 최종 보고에 명시한다.

- [ ] **Step 6: Inspect final diff and workspace state**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: 요청 범위 파일만 변경되고 공백 오류가 없으며 커밋·푸시·배포가 없다.
