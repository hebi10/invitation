# 일일 공용 체험 모드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 프로젝트 규칙상 공통 파일을 순차 수정하며 서브 에이전트로 병렬화하지 않는다.

**Goal:** 메인에서 로그인 없이 시작해 실제 관리자 청첩장 생성, 고객 역할 전환, 고객 편집·관리, 공개 미리보기를 체험하되 모든 데이터가 날짜별 공용 체험 저장소에만 기록되는 기능을 만든다.

**Architecture:** `/experience/**` UI와 `/api/experience/**` API를 운영 경로에서 분리하고, 기존 관리자·위저드·고객·테마 컴포넌트에는 운영/체험 데이터 gateway와 route builder를 주입한다. 서버가 한국시간 날짜와 서명된 체험 세션을 검증하며 `demoExperiences/{dateKey}` 전용 Repository만 사용하고, 전체 설정 단위 `version` 비교로 동시 저장 충돌을 방지한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, TanStack Query 5, Firebase Admin SDK, Cloud Firestore, CSS Modules, 기존 `scripts/run-test-suite.mjs` 테스트 하네스

## Global Constraints

- 모든 사용자 문구와 완료 보고는 한국어로 작성하고 사용자를 `해비님`이라고 부른다.
- 메인 화면에 `직접 체험하기` 진입 버튼을 추가한다.
- 기본 데이터는 `wedding` 청첩장 15개로 한정한다.
- 모든 체험자는 `Asia/Seoul` 날짜별 공용 데이터를 공유한다.
- 운영 `events`, `eventSlugIndex`, 고객 계정, `wedding-images`에는 체험 데이터를 기록하지 않는다.
- 실제 Firebase 로그인, 이메일 발송, 고객 초대 링크, 결제, 제작권 지급, 카카오 공유를 실행하지 않는다.
- 익명 이미지 업로드를 추가하지 않고 `/images/001.png`부터 `/images/005.png`까지 승인된 샘플만 선택하게 한다.
- 기존 관리자·위저드·고객·공개 테마 UI를 복제하지 않고 데이터 접근과 링크만 주입한다.
- 기본 seed 15개는 조회 전용이며 `daily-workspace`만 수정·삭제한다.
- 동시 수정은 `version` 비교와 `409 VERSION_CONFLICT`로 보호하고 자동 병합하지 않는다.
- 한국시간 00:00 이후 이전 날짜 namespace를 즉시 조회 대상에서 제외한다.
- 새 런타임 의존성을 추가하지 않는다.
- 운영 환경 Secret, Firebase 정책 배포, Cloud Scheduler 연결은 구현과 로컬 검증 후 별도 승인을 받는다.
- 사용자 요청 없이 커밋, 푸시, 배포하지 않는다. 이 계획의 작업별 커밋 단계는 의도적으로 생략한다.

---

## 파일 구조

### 신규 공통 계약과 순수 로직

- `src/types/demoExperience.ts`: 세션, 역할, 이벤트 종류, API 응답, 충돌 오류 코드를 정의한다.
- `src/lib/demoExperienceTime.ts`: 한국시간 날짜 key와 다음 자정 만료 시각을 계산한다.
- `src/lib/demoExperienceRoutes.ts`: 운영 경로와 체험 경로를 같은 인터페이스로 생성한다.
- `src/config/demoExperienceSeeds.ts`: 날짜에 따라 결정적으로 청첩장 seed 15개를 만든다.

### 신규 서버 경계

- `src/server/demoExperienceSession.ts`: HMAC 세션 발급·검증과 쿠키 옵션을 담당한다.
- `src/server/demoExperienceRequest.ts`: 세션, 역할, Origin, rate limit을 검증한다.
- `src/server/repositories/demoExperienceRepository.ts`: `demoExperiences/{dateKey}`만 읽고 쓴다.
- `src/server/demoExperienceService.ts`: bootstrap, 목록 DTO, daily workspace 저장과 충돌 판정을 조정한다.
- `src/app/api/experience/**`: 체험 세션·목록·이벤트·댓글·정리 HTTP 경계를 제공한다.

### 신규 클라이언트 경계

- `src/services/demoExperienceClient.ts`: 체험 API 응답을 기존 화면 타입으로 변환한다.
- `src/contexts/ExperienceContext.tsx`: 세션, 역할, 날짜 만료, 캐시 초기화, 종료를 관리한다.
- `src/app/experience/ExperienceAppProviders.tsx`: 체험 context, 체험용 auth snapshot, TanStack Query를 조합한다.
- `src/app/experience/_components/ExperienceBanner.tsx`: 체험 상단 바를 렌더링한다.
- `src/app/experience/**/page.tsx`: 실제 화면 컴포넌트를 체험 gateway와 route builder로 감싼다.

### 기존 화면의 주입 경계

- `src/app/admin/_hooks/adminDataGateway.ts`: 관리자 데이터 gateway 계약과 운영 기본 구현을 둔다.
- `src/app/page-wizard/wizardPersistenceGateway.ts`: 생성·조회·저장 gateway 계약과 운영 기본 구현을 둔다.
- `src/app/my-invitations/customerDataGateway.ts`: 고객 목록·방명록 gateway 계약과 운영 기본 구현을 둔다.
- `src/app/_components/eventPageThemes.ts`, `weddingPageState.tsx`, `EventInvitationPage.tsx`: 체험 page loader와 외부 공유 비활성 옵션을 받는다.

---

### Task 1: 날짜·타입·라우트 계약

**Files:**
- Create: `src/types/demoExperience.ts`
- Create: `src/lib/demoExperienceTime.ts`
- Create: `src/lib/demoExperienceRoutes.ts`
- Create: `scripts/test-demo-experience-core.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Produces: `DemoExperienceRole`, `DemoExperienceEventKind`, `DemoExperienceSessionSnapshot`, `DemoExperienceErrorCode`
- Produces: `getKstDateKey(now?: Date): string`, `getNextKstMidnight(now?: Date): Date`, `isDemoExperienceDateExpired(issuedDateKey: string, now?: Date): boolean`
- Produces: `buildAppRoutes(scope: 'production' | 'experience'): AppRoutes`

- [ ] **Step 1: 순수 로직 실패 테스트 작성**

`scripts/test-demo-experience-core.mts`에 한국시간 경계와 경로 격리를 고정한다.

```ts
import assert from 'node:assert/strict';

import {
  getKstDateKey,
  getNextKstMidnight,
  isDemoExperienceDateExpired,
} from '@/lib/demoExperienceTime';
import { buildAppRoutes } from '@/lib/demoExperienceRoutes';

assert.equal(getKstDateKey(new Date('2026-08-02T14:59:59.000Z')), '2026-08-02');
assert.equal(getKstDateKey(new Date('2026-08-02T15:00:00.000Z')), '2026-08-03');
assert.equal(
  getNextKstMidnight(new Date('2026-08-02T15:00:00.000Z')).toISOString(),
  '2026-08-03T15:00:00.000Z'
);
assert.equal(
  isDemoExperienceDateExpired('2026-08-02', new Date('2026-08-02T15:00:00.000Z')),
  true
);

const experience = buildAppRoutes('experience');
assert.equal(experience.admin(), '/experience/admin');
assert.equal(experience.wizardCreate('wedding'), '/experience/page-wizard');
assert.equal(
  experience.wizardEdit('daily-experience-wedding'),
  '/experience/page-wizard/daily-experience-wedding'
);
assert.equal(
  experience.preview('daily-experience-wedding', 'romantic'),
  '/experience/preview/daily-experience-wedding/romantic'
);
```

- [ ] **Step 2: 테스트 registry에 등록하고 실패 확인**

`test-demo-experience-core`를 `core` 배열에 추가한다.

Run: `node scripts/run-test-suite.mjs test-demo-experience-core`

Expected: FAIL because `demoExperienceTime` and `demoExperienceRoutes` do not exist.

- [ ] **Step 3: 공통 타입과 날짜 구현**

`src/types/demoExperience.ts`의 핵심 계약은 아래 이름을 그대로 사용한다.

```ts
export type DemoExperienceRole = 'admin' | 'customer';
export type DemoExperienceEventKind = 'seed' | 'daily-workspace';
export type DemoExperienceErrorCode =
  | 'DEMO_SESSION_REQUIRED'
  | 'DEMO_ROLE_FORBIDDEN'
  | 'DEMO_DAY_ROLLED_OVER'
  | 'DEMO_SEED_READ_ONLY'
  | 'VERSION_CONFLICT';

export interface DemoExperienceSessionSnapshot {
  sessionId: string;
  role: DemoExperienceRole;
  dateKey: string;
  expiresAt: number;
}
```

`src/lib/demoExperienceTime.ts`는 `Intl.DateTimeFormat(..., { timeZone: 'Asia/Seoul' })`로 날짜 key를 만들고 다음 서울 자정을 UTC `Date`로 반환한다. 시스템 locale에 의존하는 문자열 parsing은 사용하지 않는다.

- [ ] **Step 4: route builder 구현**

```ts
export interface AppRoutes {
  home(): string;
  admin(): string;
  customerDashboard(): string;
  wizardCreate(eventType: EventTypeKey): string;
  wizardEdit(slug: string): string;
  wizardResult(slug: string): string;
  preview(slug: string, theme: InvitationThemeKey): string;
}

export function buildAppRoutes(scope: 'production' | 'experience'): AppRoutes;
```

운영 구현은 기존 `getPageWizardCreateHrefForEventType`, `buildEventPreviewPath` 결과를 보존하고 체험 구현은 모든 내부 경로에 `/experience` prefix를 붙인다. slug와 theme는 `encodeURIComponent`로 인코딩한다.

- [ ] **Step 5: 단위 검증 통과 확인**

Run: `node scripts/run-test-suite.mjs test-demo-experience-core`

Expected: `demo experience core checks passed`

---

### Task 2: 서명된 체험 세션과 요청 보호

**Files:**
- Create: `src/server/demoExperienceSession.ts`
- Create: `src/server/demoExperienceRequest.ts`
- Create: `src/app/api/experience/session/route.ts`
- Create: `scripts/test-demo-experience-session.mts`
- Modify: `src/server/requestRateLimit.ts`
- Modify: `scripts/run-test-suite.mjs`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `getKstDateKey`, `getNextKstMidnight`, `DemoExperienceRole`
- Produces: `createDemoExperienceSessionValue`, `verifyDemoExperienceSessionValue`, `DEMO_EXPERIENCE_SESSION_COOKIE`
- Produces: `requireDemoExperienceSession(request, allowedRoles?)`, `assertSameOriginDemoMutation(request)`
- Produces API: `GET|POST|PATCH|DELETE /api/experience/session`

- [ ] **Step 1: 세션 위조·만료·역할 테스트 작성**

```ts
import assert from 'node:assert/strict';

import {
  createDemoExperienceSessionValue,
  verifyDemoExperienceSessionValue,
} from '@/server/demoExperienceSession';

const now = new Date('2026-08-03T03:00:00.000Z');
const issued = createDemoExperienceSessionValue(
  { sessionId: 'session-1', role: 'admin', dateKey: '2026-08-03' },
  { now, secret: 'test-secret' }
);
assert.equal(
  verifyDemoExperienceSessionValue(issued.value, { now, secret: 'test-secret' })?.role,
  'admin'
);
assert.equal(
  verifyDemoExperienceSessionValue(`${issued.value}x`, { now, secret: 'test-secret' }),
  null
);
assert.equal(
  verifyDemoExperienceSessionValue(issued.value, {
    now: new Date('2026-08-03T15:00:00.000Z'),
    secret: 'test-secret',
  }),
  null
);
```

- [ ] **Step 2: 보안 테스트 등록 후 실패 확인**

`test-demo-experience-session`을 `security` 배열에 추가한다.

Run: `node scripts/run-test-suite.mjs test-demo-experience-session`

Expected: FAIL because session functions do not exist.

- [ ] **Step 3: 세션 signer 구현**

`clientEditorSession.ts`의 HMAC·`timingSafeEqual` 패턴을 재사용하되 별도 secret을 사용한다.

```ts
export const DEMO_EXPERIENCE_SESSION_COOKIE = 'demo-experience-session';

export interface DemoExperienceSessionPayload {
  sessionId: string;
  role: DemoExperienceRole;
  dateKey: string;
  expiresAt: number;
}

export function createDemoExperienceSessionValue(
  payload: Omit<DemoExperienceSessionPayload, 'expiresAt'>,
  options?: { now?: Date; secret?: string }
): { value: string; expiresAt: number };

export function verifyDemoExperienceSessionValue(
  value: string | null | undefined,
  options?: { now?: Date; secret?: string }
): DemoExperienceSessionPayload | null;
```

`DEMO_EXPERIENCE_SESSION_SECRET`가 production에서 비어 있으면 발급과 검증을 fail closed 한다. 개발 환경 fallback은 `local-demo-experience-session-secret`만 사용한다.

- [ ] **Step 4: 동일 출처와 역할 검증 구현**

Mutation은 `Origin`과 `new URL(request.url).origin`이 정확히 같아야 한다. 세션의 `dateKey`가 현재 서울 날짜와 다르면 status `410`, code `DEMO_DAY_ROLLED_OVER`를 반환하는 오류를 던진다.

`requestRateLimit.ts`의 fail-closed scope에 아래 값을 추가한다.

```ts
'demo-experience-session'
'demo-experience-mutation'
'demo-experience-cleanup'
```

- [ ] **Step 5: 세션 route 구현**

- `GET`: 현재 세션 snapshot 반환, 없으면 401
- `POST`: rate limit 후 admin 역할 세션 시작
- `PATCH`: body `{ role: 'admin' | 'customer' }` 검증 후 같은 sessionId로 쿠키 갱신
- `DELETE`: 쿠키를 `maxAge: 0`으로 제거

쿠키 옵션은 `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'`, `path: '/'`, `expires: 다음 KST 자정`으로 고정한다.

- [ ] **Step 6: 환경 변수 예시 추가 및 보안 검증**

`.env.example` 서버 변수 영역에 값 없이 이름만 추가한다.

```env
DEMO_EXPERIENCE_SESSION_SECRET=
DEMO_EXPERIENCE_CLEANUP_SECRET=
```

Run: `node scripts/run-test-suite.mjs test-demo-experience-session`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-rate-limit-policy`

Expected: PASS with the new scopes treated as fail closed in production.

---

### Task 3: 일일 seed 15개와 전용 Repository

**Files:**
- Create: `src/config/demoExperienceSeeds.ts`
- Create: `src/server/repositories/demoExperienceRepository.ts`
- Create: `scripts/test-demo-experience-seeds.mts`
- Create: `scripts/test-demo-experience-repository-emulator.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: 기존 `createInvitationPageFromSeed`, `InvitationPageSeed`, `InvitationPageSummary`
- Produces: `createDemoExperienceSeedEvents(dateKey: string): DemoExperienceSeedEvent[]`
- Produces Repository: `bootstrapDate`, `listEvents`, `findEventBySlug`, `saveDailyWorkspace`, `deleteDailyWorkspace`, `listComments`, `deleteComment`, `recursiveDeleteDate`

- [ ] **Step 1: seed 결정성과 개수 테스트 작성**

```ts
import assert from 'node:assert/strict';
import { createDemoExperienceSeedEvents } from '@/config/demoExperienceSeeds';

const first = createDemoExperienceSeedEvents('2026-08-03');
const second = createDemoExperienceSeedEvents('2026-08-03');
assert.equal(first.length, 15);
assert.deepEqual(first, second);
assert.equal(new Set(first.map((event) => event.slug)).size, 15);
assert.ok(first.every((event) => event.config.eventType === 'wedding'));
assert.ok(first.every((event) => event.kind === 'seed'));
assert.ok(first.some((event) => event.published));
assert.ok(first.some((event) => !event.published));
assert.ok(first.some((event) => event.ownerUid === null));
assert.ok(first.some((event) => event.ownerUid !== null));
```

- [ ] **Step 2: seed 테스트 등록과 실패 확인**

`test-demo-experience-seeds`를 `core`, `test-demo-experience-repository-emulator`를 `emulator` 배열에 추가한다.

Run: `node scripts/run-test-suite.mjs test-demo-experience-seeds`

Expected: FAIL because seed generator does not exist.

- [ ] **Step 3: seed generator 구현**

15개 명세를 상수 배열로 두고 가상 이름, 장소, theme, 공개 여부, 소유 상태, 방명록 수를 결정한다. event ID와 slug는 `demo-seed-01`부터 `demo-seed-15`까지 고정하고 일정·수정 시각만 `dateKey` 기준 상대 계산한다.

승인된 이미지 경로는 아래 목록에서만 선택한다.

```ts
export const DEMO_EXPERIENCE_IMAGE_OPTIONS = [
  '/images/001.png',
  '/images/002.png',
  '/images/003.png',
  '/images/004.png',
  '/images/005.png',
] as const;
```

- [ ] **Step 4: Repository 계약과 문서 경로 구현**

```ts
export interface DemoExperienceRepository {
  bootstrapDate(dateKey: string, seeds: DemoExperienceSeedEvent[]): Promise<void>;
  listEvents(dateKey: string): Promise<DemoExperienceStoredEvent[]>;
  findEventBySlug(dateKey: string, slug: string): Promise<DemoExperienceStoredEvent | null>;
  saveDailyWorkspace(input: DemoExperienceSaveInput): Promise<DemoExperienceStoredEvent>;
  deleteDailyWorkspace(dateKey: string, slug: string): Promise<void>;
  listComments(dateKey: string, slug: string): Promise<DemoExperienceComment[]>;
  deleteComment(dateKey: string, slug: string, commentId: string): Promise<void>;
  recursiveDeleteDate(dateKey: string): Promise<void>;
}
```

Repository 상수는 아래 세 경로만 조합한다.

```ts
const DEMO_EXPERIENCES_COLLECTION = 'demoExperiences';
const DEMO_EVENTS_COLLECTION = 'events';
const DEMO_SLUG_INDEX_COLLECTION = 'slugIndex';
```

본문은 `demoExperiences/{dateKey}/events/{eventId}/content/current`, 댓글은 같은 event 하위 `comments/{commentId}`에 저장한다. 운영 Repository를 import하지 않는다.

- [ ] **Step 5: bootstrap과 동시 저장 transaction 구현**

`bootstrapDate`는 날짜 root 문서의 `seedVersion: 1`을 transaction에서 확인하고 deterministic seed 문서·content·slugIndex를 정확히 한 번 set 한다.

`saveDailyWorkspace`는 `eventId: 'daily-workspace'`를 사용하고 다음 조건을 transaction 안에서 검사한다.

```ts
if (storedVersion !== input.expectedVersion) {
  throw new DemoExperienceVersionConflictError(storedVersion);
}
```

성공 시 `version: storedVersion + 1`로 저장한다. `kind === 'seed'`인 문서의 update/delete는 Repository에서도 거부한다.

- [ ] **Step 6: Emulator 테스트 구현과 실행**

Emulator 테스트는 같은 날짜 bootstrap을 두 번 호출해 15개인지 확인하고, `expectedVersion: 0` 동시 저장 두 건 중 하나만 성공하는지 확인한다. 또한 운영 `events`와 `eventSlugIndex` collection이 비어 있는지 확인한다.

Run: `npm run test:emulator -- test-demo-experience-repository-emulator`

현재 `test:emulator`는 suite 인자를 전달하지 않으므로 개별 확인은 다음 명령을 사용한다.

Run: `firebase emulators:exec --project demo-invitation-rules --only firestore "node scripts/run-test-suite.mjs test-demo-experience-repository-emulator"`

Expected: seed count 15, one version conflict, production collection count 0.

---

### Task 4: 체험 도메인 서비스와 이벤트 API

**Files:**
- Create: `src/server/demoExperienceService.ts`
- Create: `src/app/api/experience/admin/snapshot/route.ts`
- Create: `src/app/api/experience/events/route.ts`
- Create: `src/app/api/experience/events/[slug]/route.ts`
- Create: `src/app/api/experience/events/[slug]/comments/route.ts`
- Create: `src/app/api/experience/events/[slug]/comments/[commentId]/route.ts`
- Create: `scripts/test-demo-experience-api-policy.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: Task 2 session guard, Task 3 Repository와 seed generator
- Produces: `bootstrapDailyDemoExperience`, `getDemoAdminSnapshot`, `getDemoEditableEvent`, `saveDemoDailyWorkspace`, `deleteDemoDailyWorkspace`
- Produces API response types consumed by `demoExperienceClient.ts`

- [ ] **Step 1: API 정책 실패 테스트 작성**

정적 route 검사와 순수 service dependency fake를 함께 사용한다.

```ts
assert.match(eventsRoute, /requireDemoExperienceSession/);
assert.match(eventsRoute, /assertSameOriginDemoMutation/);
assert.doesNotMatch(eventsRoute, /verifyAdminRequest|verifyCustomerRequest/);
assert.doesNotMatch(demoService, /eventRepository|customerWallet|adminUser/);
assert.match(eventRoute, /VERSION_CONFLICT/);
assert.match(eventRoute, /DEMO_SEED_READ_ONLY/);
```

- [ ] **Step 2: security suite 등록 후 실패 확인**

Run: `node scripts/run-test-suite.mjs test-demo-experience-api-policy`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: bootstrap과 DTO service 구현**

`bootstrapDailyDemoExperience(now?)`는 server dateKey를 구해 seed 15개를 Repository에 전달한다. 관리자 snapshot은 다음 구조를 반환한다.

```ts
export interface DemoExperienceAdminSnapshot {
  dateKey: string;
  pages: InvitationPageSummary[];
  comments: Comment[];
  customerAccounts: AdminCustomerAccountsSnapshot;
  dashboard: AdminDashboardSummarySnapshot;
}
```

가상 고객 UID는 연결된 seed에서 유도하고 email은 `demo01@example.invalid` 형식만 사용한다. 실제 Firebase Auth 목록을 조회하지 않는다.

- [ ] **Step 4: events API 구현**

- `GET /events`: admin이면 seed 15개와 daily workspace, customer면 daily workspace만 반환
- `POST /events`: admin 전용, 기본 seed config와 현재 daily workspace version을 반환하며 아직 저장하지 않음
- `GET /events/{slug}`: 현재 role이 접근 가능한 editable config와 version 반환
- `PATCH /events/{slug}`: body의 `expectedVersion`, `config`, `published`, `defaultTheme`를 검증하고 daily workspace만 저장
- `DELETE /events/{slug}`: admin 전용, daily workspace만 삭제

PATCH 성공 응답은 아래 필드를 반드시 포함한다.

```ts
{
  success: true,
  slug: string,
  version: number,
  editableConfig: EditableInvitationPageConfig
}
```

version 불일치는 status 409와 `{ code: 'VERSION_CONFLICT', currentVersion }`, 날짜 변경은 410과 `{ code: 'DEMO_DAY_ROLLED_OVER' }`를 반환한다.

- [ ] **Step 5: 댓글 API 구현**

댓글 조회는 admin/customer 모두 허용하고 삭제는 daily workspace 댓글만 허용한다. seed 댓글은 관리자 UI 시연을 위해 조회만 가능하며 삭제 요청에는 status 403과 `DEMO_SEED_READ_ONLY`를 반환한다.

- [ ] **Step 6: mutation rate limit 적용**

session start는 10회/10분, event/comment mutation은 sessionId+slug 기준 30회/10분으로 제한한다. 제한 응답에는 기존 `buildRateLimitHeaders` 결과를 포함한다.

- [ ] **Step 7: API 정책 검증**

Run: `node scripts/run-test-suite.mjs test-demo-experience-api-policy`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-api-repository-boundary`

Expected: PASS because Firestore 접근은 Repository에만 있다.

---

### Task 5: 체험 클라이언트와 관리자 gateway

**Files:**
- Create: `src/services/demoExperienceClient.ts`
- Create: `src/app/admin/_hooks/adminDataGateway.ts`
- Modify: `src/app/admin/_hooks/useAdminData.ts`
- Modify: `src/app/admin/AdminPageClient.tsx`
- Modify: `src/app/admin/_components/AdminShell.tsx`
- Modify: `src/app/admin/_components/AdminEventWorkspace.tsx`
- Modify: `src/app/admin/_components/AdminEventDetailPanel.tsx`
- Modify: `src/app/admin/_components/AdminEventList.tsx`
- Modify: `src/app/admin/_components/AdminEventMobileList.tsx`
- Modify: `src/app/admin/_components/AdminCustomerAccountsTab.tsx`
- Create: `scripts/test-demo-experience-admin-gateway.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: Task 4 admin snapshot와 event mutation API
- Produces: `AdminDataGateway`, `productionAdminDataGateway`, `demoExperienceAdminDataGateway`
- Changes: `AdminPageClient({ gateway?, routes?, experience? })`

- [ ] **Step 1: gateway 사용 실패 테스트 작성**

```ts
assert.match(useAdminDataSource, /gateway\.getPages/);
assert.match(useAdminDataSource, /gateway\.deleteEvent/);
assert.doesNotMatch(useAdminDataSource, /getAllManagedInvitationPages\(\)/);
assert.match(adminPageSource, /routes=/);
assert.match(workspaceSource, /금일 체험 청첩장/);
```

- [ ] **Step 2: core suite 등록 후 실패 확인**

Run: `node scripts/run-test-suite.mjs test-demo-experience-admin-gateway`

Expected: FAIL because the gateway does not exist.

- [ ] **Step 3: 관리자 gateway 계약 구현**

```ts
export interface AdminWalletGrantInput {
  kind: 'pageCreation' | 'operationTicket';
  quantity: number;
  tier?: InvitationProductTier | null;
  note?: string | null;
}

export interface AdminDataGateway {
  getDashboardSummary(): Promise<AdminDashboardSummarySnapshot>;
  getPages(): Promise<InvitationPageSummary[]>;
  getComments(): Promise<Comment[]>;
  getCustomerAccounts(): Promise<AdminCustomerAccountsSnapshot>;
  deleteComment(comment: Comment): Promise<void>;
  deleteEvent(slug: string): Promise<void>;
  setPublished(page: InvitationPageSummary, published: boolean): Promise<void>;
  setTier(page: InvitationPageSummary, tier: InvitationProductTier): Promise<void>;
  setVariant(page: InvitationPageSummary, theme: InvitationThemeKey, enabled: boolean): Promise<void>;
  issueOwnershipInvite(slug: string): Promise<AdminOwnershipInviteResult>;
  assignOwnership(uid: string, slug: string): Promise<void>;
  clearOwnership(slug: string): Promise<void>;
  grantWalletCredit(uid: string, grant: AdminWalletGrantInput): Promise<void>;
  deleteCustomer(uid: string): Promise<void>;
}
```

운영 gateway는 현재 import된 서비스 함수를 그대로 감싼다. 체험 gateway는 snapshot을 캐시하지 않고 API를 호출한다. 금지된 초대 링크·지갑·계정 작업은 `체험 모드에서는 실제 계정 작업을 실행하지 않습니다.` 오류를 반환한다.

- [ ] **Step 4: useAdminData에 gateway 주입**

`UseAdminDataParams`에 `gateway: AdminDataGateway`를 추가하고 모든 직접 service 호출을 gateway method로 교체한다. production 호출 결과와 query key는 그대로 유지한다.

- [ ] **Step 5: 관리자 내부 링크를 AppRoutes로 교체**

`AdminPageClient`, `AdminShell`, 이벤트 목록·상세·고객 탭은 `routes: AppRoutes`를 받는다. 생성·편집·미리보기·브랜드 링크가 hard-coded 운영 경로를 사용하지 않게 한다.

체험 관리자에서는 생성 메뉴를 wedding 하나로 제한하고 라벨을 `새 청첩장 만들기`로 표시한다.

- [ ] **Step 6: seed 읽기 전용과 daily 배지 렌더링**

체험 scope에서 slug가 `daily-experience-wedding`이면 이름 옆에 `금일 체험 청첩장` 배지를 표시한다. 다른 `demo-seed-*` 행에서는 수정 mutation과 위험 작업을 비활성화하고 `기본 체험 데이터는 조회 전용입니다.`를 안내한다. API도 같은 제한을 재검증한다.

- [ ] **Step 7: 관리자 gateway 검증**

Run: `node scripts/run-test-suite.mjs test-demo-experience-admin-gateway`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-admin-event-workspace-model`

Expected: PASS with production list/filter behavior unchanged.

---

### Task 6: 체험 Provider·상단 바·메인 진입

**Files:**
- Create: `src/contexts/ExperienceContext.tsx`
- Modify: `src/contexts/index.ts`
- Modify: `src/contexts/AdminContext.tsx`
- Create: `src/app/experience/ExperienceAppProviders.tsx`
- Create: `src/app/experience/layout.tsx`
- Create: `src/app/experience/_components/ExperienceBanner.tsx`
- Create: `src/app/experience/_components/ExperienceBanner.module.css`
- Create: `src/app/experience/admin/page.tsx`
- Create: `src/app/_components/ExperienceStartButton.tsx`
- Create: `src/app/_components/ExperienceStartButton.module.css`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Create: `scripts/test-demo-experience-routes.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: session API, `demoExperienceAdminDataGateway`, experience `AppRoutes`
- Produces: `useExperience()`, `ExperienceAuthProvider`, `/experience/admin`

- [ ] **Step 1: 라우트와 메인 CTA 실패 테스트 작성**

```ts
assert.ok(existsSync('src/app/experience/admin/page.tsx'));
assert.match(homePage, /직접 체험하기/);
assert.match(experienceLayout, /ExperienceBanner/);
assert.match(experienceAdminPage, /demoExperienceAdminDataGateway/);
assert.doesNotMatch(experienceAdminPage, /AuthenticatedAppProviders/);
```

- [ ] **Step 2: architecture suite 등록 후 실패 확인**

Run: `node scripts/run-test-suite.mjs test-demo-experience-routes`

Expected: FAIL because experience routes do not exist.

- [ ] **Step 3: ExperienceContext 구현**

```ts
export interface ExperienceContextValue {
  session: DemoExperienceSessionSnapshot;
  switchRole(role: DemoExperienceRole): Promise<void>;
  endExperience(): Promise<void>;
  routes: AppRoutes;
}
```

Provider mount 시 `GET /api/experience/session`을 호출한다. 401이면 메인으로, 410이면 새 session POST 후 `/experience/admin?reset=1`로 이동한다. `expiresAt`까지 `window.setTimeout`을 설정하고 만료 시 `queryClient.clear()` 후 동일하게 재시작한다.

- [ ] **Step 4: 체험용 auth snapshot 주입**

`AdminContext.tsx`에 기존 context를 재사용하는 `AdminSessionProvider`를 추가한다. `ExperienceAuthProvider`는 아래 가상 사용자만 제공한다.

```ts
const demoAuthUser: AuthUser = {
  uid: 'demo-experience-user',
  email: 'experience@example.invalid',
  displayName: '체험 사용자',
  emailVerified: true,
};
```

role이 admin이면 `adminUser`를 제공하고 customer면 `adminUser: null`로 둔다. login/register/Google/email 전송 함수는 실제 Firebase 함수를 호출하지 않고 체험 안내 오류를 반환한다.

- [ ] **Step 5: 상단 바 구현**

상단 바에는 `체험 중`, 현재 역할, 역할 전환, `매일 00:00 초기화`, 개인정보 금지, `체험 종료`를 제공한다. 모바일에서는 안내 문구를 두 줄 이하로 유지하고 기존 고정 헤더보다 위에 배치한다. 역할 전환 후 admin은 `routes.admin()`, customer는 `routes.customerDashboard()`로 이동한다.

- [ ] **Step 6: 메인 시작 버튼 구현**

클릭 시 공유·자정 초기화·개인정보 금지 안내를 먼저 표시한다. `체험 시작` 확정 후 `POST /api/experience/session`이 성공하면 `/experience/admin`으로 이동한다. 요청 중 중복 클릭을 막고 429/500 응답은 버튼 인접 오류 문구로 표시한다.

- [ ] **Step 7: 관리자 체험 route 연결과 검증**

`/experience/admin`은 `AdminPageClient`에 experience gateway/routes/flag를 전달한다.

Run: `node scripts/run-test-suite.mjs test-demo-experience-routes`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

---

### Task 7: 관리자 생성 위저드와 충돌 저장

**Files:**
- Create: `src/app/page-wizard/wizardPersistenceGateway.ts`
- Modify: `src/app/page-wizard/PageWizardClient.tsx`
- Modify: `src/app/page-wizard/hooks/useWizardPersistence.ts`
- Modify: `src/app/page-wizard/PageWizardResultClient.tsx`
- Modify: `src/app/page-wizard/steps/ImagesStep.tsx`
- Create: `src/app/page-wizard/steps/DemoExperienceImagePicker.tsx`
- Create: `src/app/page-wizard/steps/DemoExperienceImagePicker.module.css`
- Create: `src/app/experience/page-wizard/page.tsx`
- Create: `src/app/experience/page-wizard/[slug]/page.tsx`
- Create: `src/app/experience/page-wizard/[slug]/result/page.tsx`
- Create: `scripts/test-demo-experience-wizard.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: event POST/GET/PATCH API, experience routes, sample images
- Produces: `WizardPersistenceGateway`, `productionWizardPersistenceGateway`, `demoExperienceWizardPersistenceGateway`
- Changes: `PageWizardClient({ gateway?, routes?, experience? })`

- [ ] **Step 1: 위저드 gateway와 링크 실패 테스트 작성**

```ts
assert.match(persistenceHook, /gateway\.createDraft/);
assert.match(persistenceHook, /gateway\.save/);
assert.match(wizardClient, /persistedVersion/);
assert.match(wizardClient, /VERSION_CONFLICT/);
assert.match(wizardClient, /routes\.wizardResult/);
assert.doesNotMatch(experienceWizardPage, /getServerInvitationPageBySlug/);
```

- [ ] **Step 2: core suite 등록 후 실패 확인**

Run: `node scripts/run-test-suite.mjs test-demo-experience-wizard`

Expected: FAIL because gateway and routes do not exist.

- [ ] **Step 3: 위저드 gateway 계약 구현**

```ts
export interface WizardDraftSnapshot {
  slug: string;
  config: InvitationPageSeed;
  version: number | null;
}

export interface WizardPersistenceGateway {
  createDraft(input: CreateInvitationPageDraftInput): Promise<WizardDraftSnapshot>;
  loadEditable(slug: string): Promise<EditableInvitationPageConfig & { version: number | null }>;
  save(input: {
    slug: string;
    config: InvitationPageSeed;
    published: boolean;
    defaultTheme: InvitationThemeKey;
    expectedVersion: number | null;
  }): Promise<EditableInvitationPageConfig & { version: number | null }>;
}
```

production gateway는 version을 `null`로 유지하고 기존 함수 호출을 보존한다. experience gateway는 현재 server version을 전달한다.

- [ ] **Step 4: useWizardPersistence에 version 연결**

`PageWizardClient`에 `persistedVersion` state를 추가한다. load/create/save 성공 시 응답 version으로 갱신한다. 체험 저장에서 409가 발생하면 자동 재시도하지 않고 notice를 표시한다.

```text
다른 체험자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 저장해 주세요.
```

사용자가 `최신 내용 불러오기`를 누르면 existing query를 refetch하고 form/version을 함께 교체한다.

- [ ] **Step 5: 위저드 내부 경로 주입**

결과, 내 청첩장, 편집 화면 링크를 `routes`로 변경한다. 체험 생성 완료 결과 화면의 기본 주요 버튼은 `고객 화면으로 전환해 계속 입력하기`이며 `switchRole('customer')` 성공 후 experience edit 경로로 이동한다.

- [ ] **Step 6: 이미지 입력을 승인된 샘플 선택으로 대체**

experience flag일 때 file input과 upload handler 대신 `DemoExperienceImagePicker`를 렌더링한다. 선택값은 `DEMO_EXPERIENCE_IMAGE_OPTIONS`의 값만 form config에 기록한다. API 저장 시에도 이 allowlist 밖의 이미지 URL이 있으면 status 400으로 거부한다.

- [ ] **Step 7: experience 위저드 route 구현**

생성 route는 wedding 고정으로 `PageWizardClient initialSlug={null}`을 렌더링한다. 상세·결과 route는 운영 server loader를 호출하지 않고 체험 클라이언트 gateway가 session 검증 후 로드한다.

- [ ] **Step 8: 위저드와 회귀 검증**

Run: `node scripts/run-test-suite.mjs test-demo-experience-wizard`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-page-wizard-event-type-lock`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-page-wizard-schedule-time`

Expected: PASS.

---

### Task 8: 고객 관리와 역할 전환

**Files:**
- Create: `src/app/my-invitations/customerDataGateway.ts`
- Modify: `src/app/my-invitations/MyInvitationsClient.tsx`
- Create: `src/app/experience/my-invitations/page.tsx`
- Modify: `src/lib/appQuery.ts`
- Create: `scripts/test-demo-experience-customer.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: experience events/comments API와 `AppRoutes`
- Produces: `CustomerDataGateway`, `productionCustomerDataGateway`, `demoExperienceCustomerDataGateway`
- Changes: `MyInvitationsClient({ gateway?, routes?, experience? })`

- [ ] **Step 1: 고객 gateway 실패 테스트 작성**

```ts
assert.match(customerClient, /gateway\.listEvents/);
assert.match(customerClient, /gateway\.listComments/);
assert.match(customerClient, /routes\.wizardEdit/);
assert.match(customerClient, /routes\.preview/);
assert.doesNotMatch(experienceCustomerPage, /getCustomerWalletSnapshot/);
```

- [ ] **Step 2: core suite 등록 후 실패 확인**

Run: `node scripts/run-test-suite.mjs test-demo-experience-customer`

Expected: FAIL because customer gateway does not exist.

- [ ] **Step 3: 고객 gateway 계약 구현**

```ts
export interface CustomerDataGateway {
  listEvents(): Promise<CustomerOwnedEventSummary[]>;
  getWallet(): Promise<CustomerWalletSummary>;
  listComments(slug: string): Promise<CustomerEventGuestbookComment[]>;
  deleteComment(slug: string, commentId: string): Promise<void>;
}
```

체험 wallet은 화면 분기를 안정시키는 0 잔액 snapshot만 반환하고 지갑 API나 Firebase token을 호출하지 않는다. 체험 events는 daily workspace 하나만 반환한다.

- [ ] **Step 4: 고객 화면에 gateway/routes 주입**

`OwnedEventCard`까지 gateway/routes를 전달해 편집·미리보기·댓글 API가 운영 경로로 빠지지 않게 한다. experience에서는 이메일 인증·회원가입·제작권 생성 UI를 건너뛰고 상단 바의 관리자 전환을 사용한다.

- [ ] **Step 5: 체험 query key 격리**

운영 cache와 충돌하지 않도록 `appQueryKeys`에 아래 key를 추가한다.

```ts
demoExperienceSession: ['demo-experience-session'] as const,
demoExperienceAdmin: (dateKey: string) => ['demo-experience-admin', dateKey] as const,
demoExperienceEvent: (dateKey: string, slug: string) =>
  ['demo-experience-event', dateKey, slug] as const,
demoExperienceCustomer: (dateKey: string) => ['demo-experience-customer', dateKey] as const,
```

- [ ] **Step 6: 고객 route와 검증**

`/experience/my-invitations`은 `MyInvitationsClient`에 체험 gateway/routes/flag를 전달한다.

Run: `node scripts/run-test-suite.mjs test-demo-experience-customer`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-customer-page-wizard-save-route`

Expected: PASS with the production customer API unchanged.

---

### Task 9: 실제 테마 기반 체험 미리보기

**Files:**
- Modify: `src/app/_components/eventPageThemes.ts`
- Modify: `src/app/_components/weddingPageState.tsx`
- Modify: `src/app/_components/EventInvitationPage.tsx`
- Create: `src/app/experience/preview/[slug]/[[...theme]]/page.tsx`
- Create: `src/app/experience/preview/[slug]/[[...theme]]/ExperienceInvitationPreviewClient.tsx`
- Create: `scripts/test-demo-experience-preview.mts`
- Modify: `scripts/run-test-suite.mjs`

**Interfaces:**
- Consumes: 체험 editable event GET와 기존 wedding theme renderer
- Adds options: `pageLoader`, `queryScope`, `allowStorageImages`, `externalShareEnabled`
- Produces: `/experience/preview/{slug}/{theme?}`

- [ ] **Step 1: preview 데이터 경계 실패 테스트 작성**

```ts
assert.match(eventThemeTypes, /pageLoader/);
assert.match(eventPage, /externalShareEnabled/);
assert.match(previewClient, /getDemoExperienceEvent/);
assert.match(previewClient, /externalShareEnabled=\{false\}/);
assert.doesNotMatch(previewPage, /getServerInvitationPageBySlug/);
```

- [ ] **Step 2: core suite 등록 후 실패 확인**

Run: `node scripts/run-test-suite.mjs test-demo-experience-preview`

Expected: FAIL because preview route and loader injection do not exist.

- [ ] **Step 3: 이벤트 state loader 주입**

`EventInvitationRouteOptions`에 아래 선택 필드를 추가한다.

```ts
pageLoader?: (slug: string) => Promise<InvitationPage | null>;
queryScope?: 'admin' | 'public' | 'experience';
allowStorageImages?: boolean;
externalShareEnabled?: boolean;
```

기본값은 기존 운영 동작이다. `pageLoader`가 있으면 `loadWeddingInvitationPage` 대신 사용한다. `allowStorageImages === false`이면 `usePageImages` query를 끄고 config의 승인된 정적 이미지만 렌더링한다. `appQueryKeys.invitationPage`의 scope union에 `experience`를 추가해 운영 admin/public cache와 분리한다.

- [ ] **Step 4: 외부 공유 차단**

`EventInvitationPage`는 `externalShareEnabled === false`일 때 Kakao share button을 렌더링하지 않고 상단 체험 바 안내에 의존한다. production 기본값은 true로 유지한다.

- [ ] **Step 5: 체험 preview route 구현**

route는 slug와 theme를 검증하고 client가 체험 API에서 config를 로드한다. `EventInvitationPage`에 `showGuestbook={false}`, `allowStorageImages={false}`, `externalShareEnabled={false}`, experience page loader를 전달한다. 나머지 테마 렌더러와 섹션은 그대로 사용한다.

- [ ] **Step 6: 미리보기 회귀 검증**

Run: `node scripts/run-test-suite.mjs test-demo-experience-preview`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-classic-r-theme`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-kakao-share-url-policy`

Expected: PASS for production sharing.

---

### Task 10: 자정 전환·정리·Rules·문서·통합 검증

**Files:**
- Create: `src/app/api/experience/cleanup/route.ts`
- Create: `scripts/test-demo-experience-cleanup-policy.mts`
- Create: `scripts/test-demo-experience-boundary.mts`
- Modify: `firestore.rules`
- Modify: `storage.rules`
- Modify: `scripts/test-firestore-rules-emulator.mts`
- Modify: `scripts/test-storage-rules-emulator.mts`
- Modify: `scripts/test-project-guardrails.mts`
- Modify: `scripts/test-route-docs-consistency.mts`
- Modify: `scripts/run-test-suite.mjs`
- Modify: `README.md`
- Modify: `docs/security-hardening-checklist.md`

**Interfaces:**
- Consumes: `recursiveDeleteDate`, 현재 KST dateKey, cleanup secret
- Produces API: `POST /api/experience/cleanup`
- Enforces: 체험 경로 client direct access deny, 운영/체험 import boundary

- [ ] **Step 1: 정리 안전 정책 테스트 작성**

```ts
assert.equal(canDeleteDemoExperienceDate('2026-08-02', '2026-08-03'), true);
assert.equal(canDeleteDemoExperienceDate('2026-08-03', '2026-08-03'), false);
assert.equal(canDeleteDemoExperienceDate('2026-08-04', '2026-08-03'), false);
assert.equal(canDeleteDemoExperienceDate('../events', '2026-08-03'), false);
```

cleanup route 정적 검사에서 `DEMO_EXPERIENCE_CLEANUP_SECRET`, `recursiveDeleteDate`, `demoExperiences`를 확인하고 운영 collection 이름을 사용하지 않는지 검사한다.

- [ ] **Step 2: architecture/security suite 등록 후 실패 확인**

`test-demo-experience-cleanup-policy`를 security, `test-demo-experience-boundary`를 architecture에 등록한다.

Run: `node scripts/run-test-suite.mjs test-demo-experience-cleanup-policy`

Expected: FAIL because cleanup route does not exist.

- [ ] **Step 3: cleanup route 구현**

`Authorization: Bearer <DEMO_EXPERIENCE_CLEANUP_SECRET>`를 timing-safe 방식으로 검증한다. body `{ dateKey }`는 `YYYY-MM-DD` 정규식과 실제 날짜 유효성을 통과하고 현재 KST 날짜보다 과거일 때만 삭제한다. 삭제 대상은 Repository가 만든 `demoExperiences/{dateKey}` DocumentReference 하나이며 `recursiveDelete`로 하위 event/content/comment/index를 함께 제거한다.

이 route를 Cloud Scheduler에 연결하거나 배포 환경 secret을 설정하는 작업은 수행하지 않는다. 사용자가 별도로 승인한 배포 단계에서만 연결한다.

- [ ] **Step 4: Rules에 명시적 deny 추가**

Firestore default deny가 이미 존재하지만 회귀 가독성을 위해 운영 match 앞에 다음 규칙을 둔다.

```rules
match /demoExperiences/{document=**} {
  allow read, write: if false;
}
```

Storage에는 체험 upload 경로를 허용하지 않는다. 명시적 deny를 둔다.

```rules
match /demo-wedding-images/{allPaths=**} {
  allow read, write: if false;
}
```

Emulator 테스트에서 anonymous, customer, admin client SDK가 두 경로를 모두 읽거나 쓰지 못하는지 확인한다. 서버 Admin SDK 테스트만 Repository를 사용한다.

- [ ] **Step 5: 아키텍처 경계 검사 추가**

`test-demo-experience-boundary.mts`는 아래를 검사한다.

- `src/server/repositories/demoExperienceRepository.ts`만 `demoExperiences` collection literal을 가짐
- `src/server/demoExperienceService.ts`와 `/api/experience/**`가 운영 event/customer Repository를 import하지 않음
- 운영 `/api/admin/**`, `/api/customer/**`가 demo Repository를 import하지 않음
- `/experience/**`에서 `/api/admin`, `/api/customer`, Firebase token helper를 직접 호출하지 않음
- 체험 UI 내부 링크가 `AppRoutes`를 사용함

- [ ] **Step 6: 문서와 route consistency 갱신**

README에 체험 목적, `/experience/admin`, `/experience/page-wizard/{slug}`, `/experience/my-invitations`, 날짜별 공용 데이터와 운영 격리를 기록한다. 보안 체크리스트에는 체험 session, rate limit, 자정 rollover, production collection 무변경 확인을 추가한다. route consistency 배열에 주요 experience route를 등록한다.

- [ ] **Step 7: 변경 범위 자동 검증**

Run: `node scripts/run-test-suite.mjs test-demo-experience-cleanup-policy`

Expected: PASS.

Run: `node scripts/run-test-suite.mjs test-demo-experience-boundary`

Expected: PASS.

Run: `npm run test:security`

Expected: PASS.

Run: `npm run test:architecture`

Expected: PASS.

Run: `npm run typecheck:web`

Expected: PASS.

Run: `npm run lint:web`

Expected: PASS.

- [ ] **Step 8: 전체 자동 검증**

Run: `npm test`

Expected: 모든 fast test PASS.

Run: `npm run test:emulator`

Expected: Firestore/Storage rules와 demo repository emulator test PASS.

Run: `npm run build`

Expected: Next.js production build PASS. 이 명령은 프로젝트 script에 따라 재생성 가능한 `.next`를 정리한다. 최종 보고에 이 사실을 남긴다.

- [ ] **Step 9: 브라우저 데스크톱 QA**

로컬 서버를 실행하고 브라우저에서 아래 순서를 확인한다.

1. `/`의 `직접 체험하기` → 안내 → `/experience/admin`
2. 관리자 목록 seed 정확히 15개와 조회 전용 안내
3. `새 청첩장 만들기` → 실제 wedding 위저드 → 저장
4. 관리자 목록의 `금일 체험 청첩장` 배지
5. 결과 화면의 고객 역할 전환
6. `/experience/page-wizard/{slug}`에서 수정·저장
7. `/experience/my-invitations`에 daily workspace 하나만 표시
8. `/experience/preview/{slug}/{theme}`에서 실제 테마 렌더링과 외부 공유 미노출
9. 관리자 역할 복귀와 변경 내용 반영
10. 체험 종료 후 `/` 이동

- [ ] **Step 10: 브라우저 동시성과 모바일 QA**

서로 다른 두 브라우저 컨텍스트에서 같은 version을 연 뒤 먼저 저장한 컨텍스트만 성공하고 다른 컨텍스트는 충돌 안내를 표시하는지 확인한다. 390px 모바일 viewport에서 상단 바, 관리자 카드 목록, 위저드, 고객 카드, 미리보기에 가로 스크롤이 없는지 확인한다.

- [ ] **Step 11: 자정 rollover QA**

개발 전용 주입 시계 또는 fake clock으로 다음 KST 자정을 넘긴다. 열린 query cache가 제거되고 `새로운 체험일이 시작되어 데이터가 초기화되었습니다.` 안내 후 seed 15개만 있는 새 `/experience/admin`으로 이동하는지 확인한다. 실제 시스템 시각은 변경하지 않는다.

- [ ] **Step 12: 최종 변경 상태 확인**

Run: `git diff --check`

Expected: 출력 없음.

Run: `git status --short`

Expected: 이 계획에 명시된 파일만 변경됨. 커밋·푸시·배포는 하지 않는다.

---

## 구현 완료 조건

- 관리자 seed 15개와 날짜별 daily workspace가 체험 Repository에서만 동작한다.
- 실제 관리자·위저드·고객·테마 UI가 체험 gateway/routes를 통해 재사용된다.
- 운영 인증과 운영 Repository 코드는 체험 session을 권한으로 인정하지 않는다.
- 역할 전환, 결과 화면, 고객 관리, preview가 `/experience/**` 안에서 끝난다.
- version 충돌과 날짜 rollover가 사용자에게 명시적으로 안내된다.
- 실제 이메일·결제·외부 공유·임의 이미지 업로드가 발생하지 않는다.
- 보안·아키텍처·타입·린트·기본·에뮬레이터·빌드 검증 결과가 보고된다.
- 사용자의 별도 승인 전에는 commit, push, deploy, secret 설정, Cloud Scheduler 연결을 수행하지 않는다.
