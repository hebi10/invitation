# Authentication Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자·고객·모바일 고객 인증을 공통 검증기로 통일하고, 잘못된 토큰이 `500`으로 처리되는 경로를 기존 API 계약을 깨지 않고 `401`로 고정한다.

**Architecture:** Firebase ID 토큰 해석은 `src/server/adminApiAuth.ts`와 `src/server/customerApiAuth.ts`만 담당한다. API Route는 공통 인증 오류를 기존 사용자 문구와 상태 코드로 매핑하고, 소유권 판단에는 서버가 검증한 UID만 전달한다.

**Tech Stack:** Next.js 15 Route Handlers, TypeScript, Firebase Admin Auth, Node.js `assert`, `tsx`

## Global Constraints

- 공개 URL, API URL, 요청 필드, 성공 응답 필드를 변경하지 않는다.
- Firestore 저장 스키마를 변경하지 않는다.
- 모바일 앱 UI는 수정하지 않는다.
- 새 외부 의존성을 추가하지 않는다.
- 운영 데이터, 환경 변수, 배포 설정을 변경하지 않는다.
- 커밋, 푸시, 배포는 해비님의 별도 요청 전까지 수행하지 않는다.

---

### Task 1: 관리자 토큰 오류 정규화

**Files:**
- Modify: `src/server/adminApiAuth.ts:7-38`
- Create: `scripts/test-admin-api-auth.mts`
- Modify: `package.json:26-30`

**Interfaces:**
- Consumes: `isServerAdminUserEnabled(uid)`, `getServerAuth()`
- Produces: `verifyAdminRequest(request, options?)`
- Produces: `VerifyAdminRequestOptions`의 테스트용 `auth`, `isAdminEnabled` 주입점

- [ ] **Step 1: 관리자 인증 실패 테스트 작성**

`scripts/test-admin-api-auth.mts`에 다음 다섯 경우를 작성한다.

```ts
await assertRejectsWithStatus(
  () => verifyAdminRequest(requestWithAuthorization(null)),
  401
);
await assertRejectsWithStatus(
  () => verifyAdminRequest(requestWithAuthorization('Bearer invalid'), {
    auth: { verifyIdToken: async () => { throw new Error('invalid'); } },
    isAdminEnabled: async () => true,
  }),
  401
);
await assertRejectsWithStatus(
  () => verifyAdminRequest(requestWithAuthorization('Bearer valid'), {
    auth: null,
    isAdminEnabled: async () => true,
  }),
  500
);
await assertRejectsWithStatus(
  () => verifyAdminRequest(requestWithAuthorization('Bearer valid'), {
    auth: { verifyIdToken: async () => ({ uid: 'user-1' }) },
    isAdminEnabled: async () => false,
  }),
  403
);
const admin = await verifyAdminRequest(
  requestWithAuthorization('Bearer valid'),
  {
    auth: { verifyIdToken: async () => ({ uid: 'admin-1', email: 'admin@example.test' }) },
    isAdminEnabled: async () => true,
  }
);
assert.equal(admin.uid, 'admin-1');
```

- [ ] **Step 2: 테스트를 실행해 잘못된 토큰이 현재 공통 `AdminApiAuthError`로 정규화되지 않음을 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-api-auth.mts`

Expected: invalid-token 시나리오가 `AdminApiAuthError(401)`가 아닌 원본 예외로 실패한다.

- [ ] **Step 3: 관리자 인증 검증기에 테스트 주입점과 `401` 변환 추가**

`src/server/adminApiAuth.ts`에 다음 형태를 추가한다.

```ts
type AdminDecodedToken = Pick<DecodedIdToken, 'uid'> & Partial<DecodedIdToken>;
type AdminAuthVerifier = {
  verifyIdToken(idToken: string): Promise<AdminDecodedToken>;
};
type VerifyAdminRequestOptions = {
  auth?: AdminAuthVerifier | null;
  isAdminEnabled?: (uid: string) => Promise<boolean>;
};

export async function verifyAdminRequest(
  request: Request,
  options: VerifyAdminRequestOptions = {}
) {
  const auth = Object.hasOwn(options, 'auth') ? options.auth : getServerAuth();
  if (!auth) {
    throw new AdminApiAuthError(500, 'Firebase Admin Auth를 초기화하지 못했습니다.');
  }

  let decodedToken: AdminDecodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch {
    throw new AdminApiAuthError(401, '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const isAdminEnabled =
    options.isAdminEnabled ?? isServerAdminUserEnabled;
  if (!(await isAdminEnabled(decodedToken.uid))) {
    throw new AdminApiAuthError(403, '관리자 권한이 없습니다.');
  }
  return decodedToken;
}
```

토큰 누락 검사는 기존 위치와 문구를 유지한다.

- [ ] **Step 4: 관리자 인증 테스트 실행**

Run: `npx --yes tsx --conditions react-server scripts/test-admin-api-auth.mts`

Expected: `admin API auth checks passed`

- [ ] **Step 5: package script 등록**

`package.json`에 다음 스크립트를 추가한다.

```json
"test:admin-api-auth": "npx --yes tsx --conditions react-server scripts/test-admin-api-auth.mts"
```

- [ ] **Step 6: 체크포인트 검증**

Run: `npm run test:admin-api-auth`

Run: `npm run typecheck:web`

Expected: 두 명령 모두 성공한다.

### Task 2: 웹 고객 API 인증 단일화

**Files:**
- Modify: `src/app/api/customer/events/route.ts:24-73`
- Modify: `src/app/api/customer/wallet/route.ts:1-50`
- Modify: `src/app/api/customer/events/[slug]/comments/route.ts:1-48`
- Modify: `src/app/api/customer/events/[slug]/editable/route.ts:1-96`
- Modify: `src/app/api/customer/events/[slug]/ownership/route.ts:1-53`
- Create: `scripts/test-customer-auth-route-policy.mts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `verifyCustomerRequest(request)`, `verifyCustomerUid(request)`
- Consumes: `CustomerApiAuthError`, `toSafeHttpErrorResponse(error, fallback?)`
- Produces: 모든 `/api/customer/**` 보호 라우트의 동일한 토큰 검증 경계

- [ ] **Step 1: 고객 라우트 정책 검사 작성**

`scripts/test-customer-auth-route-policy.mts`가 `src/app/api/customer` 아래 모든
`route.ts`를 순회해 다음을 검사하도록 작성한다.

```ts
assert.equal(
  /from ['"]@\/server\/firebaseAdmin['"]/.test(source),
  false,
  `${relativePath} must not import Firebase Admin Auth directly.`
);
assert.equal(
  /\.verifyIdToken\s*\(/.test(source),
  false,
  `${relativePath} must use customerApiAuth.`
);
```

각 보호 라우트가 `verifyCustomerRequest` 또는 `verifyCustomerUid`를 포함하는지도
검사한다.

- [ ] **Step 2: 정책 검사를 실행해 중복 인증 경로를 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-customer-auth-route-policy.mts`

Expected: `events`, `wallet`, `comments`, `editable`, `ownership` 라우트가 직접
`getServerAuth` 또는 `verifyIdToken`을 사용해 실패한다.

- [ ] **Step 3: 고객 라우트의 로컬 인증 함수 제거**

각 라우트에서 `getServerAuth` import와 로컬 `verifyCustomer*` 함수를 제거하고
다음 패턴을 적용한다.

```ts
import {
  CustomerApiAuthError,
  verifyCustomerRequest,
  verifyCustomerUid,
} from '@/server/customerApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
```

토큰 전체 정보가 필요한 `src/app/api/customer/events/route.ts`는
`verifyCustomerRequest`, UID만 필요한 나머지 라우트는 `verifyCustomerUid`를
사용한다.

- [ ] **Step 4: 인증 예외를 기존 응답 문구와 함께 안전하게 매핑**

각 `catch`의 첫 분기에 다음 패턴을 추가한다.

```ts
if (error instanceof CustomerApiAuthError) {
  return toSafeHttpErrorResponse(error);
}
```

각 라우트의 기존 업무 오류 fallback 문구는 유지한다. 이 변경으로 잘못된 토큰은
기존의 일반 `500` 분기 대신 `401`이 된다.

- [ ] **Step 5: 고객 인증 테스트와 정책 검사 실행**

Run: `npm run test:customer-api-auth`

Run: `npx --yes tsx --conditions react-server scripts/test-customer-auth-route-policy.mts`

Expected: 두 명령 모두 성공한다.

- [ ] **Step 6: package script 등록**

```json
"test:customer-auth-route-policy": "npx --yes tsx --conditions react-server scripts/test-customer-auth-route-policy.mts"
```

- [ ] **Step 7: 체크포인트 검증**

Run: `npm run test:customer-api-auth`

Run: `npm run test:customer-auth-route-policy`

Run: `npm run test:customer-page-wizard-save-route`

Run: `npm run typecheck:web`

Expected: 모든 명령이 성공한다.

### Task 3: 모바일 고객 인증의 공통 검증기 사용

**Files:**
- Modify: `src/app/api/mobile/billing/fulfill/route.ts:8-69`
- Modify: `src/app/api/mobile/client-editor/drafts/route.ts:19-58`
- Create: `scripts/test-mobile-customer-auth-policy.mts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `verifyCustomerRequest(request)`
- Produces: 기존 영문 모바일 오류 메시지를 보존하는 인증 매핑

- [ ] **Step 1: 모바일 인증 정책 검사 작성**

두 라우트가 `@/server/customerApiAuth`의 `verifyCustomerRequest`를 import하고
`getServerAuth`와 직접 `.verifyIdToken(`을 사용하지 않는지 검사한다. 다음 기존
문구도 그대로 남아 있는지 확인한다.

```ts
assert.ok(billingRoute.includes('Customer authentication is required.'));
assert.ok(draftRoute.includes('Customer authentication is required.'));
```

- [ ] **Step 2: 검사를 실행해 직접 인증 경로를 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-mobile-customer-auth-policy.mts`

Expected: 두 라우트의 직접 Firebase Admin Auth 사용 때문에 실패한다.

- [ ] **Step 3: 모바일 라우트의 직접 토큰 검증 제거**

`verifyCustomerRequest`를 호출하고 `CustomerApiAuthError`를 다음처럼 기존 모바일
응답으로 변환한다.

```ts
try {
  return {
    identity: await verifyCustomerRequest(request),
    response: null,
  } as const;
} catch (error) {
  if (error instanceof CustomerApiAuthError) {
    return {
      identity: null,
      response: NextResponse.json(
        {
          error:
            error.status === 401
              ? 'Customer authentication is required.'
              : GENERIC_SERVER_ERROR_MESSAGE,
        },
        { status: error.status }
      ),
    } as const;
  }
  throw error;
}
```

draft 라우트에도 같은 상태 매핑을 적용하되 기존 성공 응답과 생성 흐름은 변경하지
않는다.

- [ ] **Step 4: 모바일 정책 검사와 기존 보안 검사 실행**

Run: `npx --yes tsx --conditions react-server scripts/test-mobile-customer-auth-policy.mts`

Run: `npm run test:mobile-session-security-policy`

Run: `npm run test:mobile-device-id-and-billing-policy`

Expected: 모든 명령이 성공한다.

- [ ] **Step 5: package script 등록 및 체크포인트 검증**

```json
"test:mobile-customer-auth-policy": "npx --yes tsx --conditions react-server scripts/test-mobile-customer-auth-policy.mts"
```

Run: `npm run test:mobile-customer-auth-policy`

Run: `npm run typecheck:web`

Run: `npm run typecheck:mobile`

Expected: 모든 명령이 성공한다.

### Task 4: 인증 단계 통합 검증

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1-3의 인증 검사 스크립트
- Produces: `test:auth-hardening`

- [ ] **Step 1: 인증 통합 스크립트 추가**

```json
"test:auth-hardening": "npm run test:admin-api-auth && npm run test:customer-api-auth && npm run test:customer-auth-route-policy && npm run test:mobile-customer-auth-policy && npm run test:mobile-session-security-policy"
```

- [ ] **Step 2: 통합 검증**

Run: `npm run test:auth-hardening`

Run: `npm run test:security-hardening`

Run: `npm run lint:web`

Run: `npm run typecheck:web`

Expected: 모든 명령이 성공한다.

- [ ] **Step 3: 제거된 UI와 호환 API의 사용처 구분**

Run: `npm run test:page-editor-route-removal`

Run: `rg -n "/api/client-editor|api/client-editor" src apps`

Expected: `/page-editor` UI 라우트는 없고, `/api/client-editor/**`를 호출하는 코드가
있다면 정확한 파일 목록이 출력된다. 이 API는 이번 단계에서 삭제하거나 응답을
변경하지 않고 최종 잔여 위험에 기록한다.

- [ ] **Step 4: 변경 범위 확인**

Run: `rg -n "getServerAuth|verifyIdToken" src/app/api/customer src/app/api/mobile/billing/fulfill/route.ts src/app/api/mobile/client-editor/drafts/route.ts`

Expected: 고객 및 대상 모바일 라우트에서 직접 Firebase Auth 검증이 남아 있지
않다.
