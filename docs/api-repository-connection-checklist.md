# API 저장소 계층 연결 체크리스트

## 목적

- `src/app/api` 라우트가 기존 Firestore 컬렉션 경로를 직접 다루지 않도록 유지한다.
- API 요청/응답 계약은 유지하고, 내부 구현만 `server service -> repository` 또는 `repository` 경유로 통일한다.
- `events` 구조 컷오버 완료 이후에도 API 라우트 수정 범위를 최소화한다.

## 경계 원칙

1. API 라우트는 `@/services/*` 클라이언트 Firestore helper를 import 하지 않는다.
2. API 라우트는 Firestore collection/doc 경로를 직접 다루지 않는다.
3. Firestore 접근은 `src/server/repositories/*` 또는 그 위의 `src/server/*` service에만 둔다.
4. Storage 접근은 예외적으로 API 라우트에서 `firebaseAdmin` bucket helper를 사용할 수 있다.
5. rate limit 상태처럼 운영성 보조 컬렉션도 `src/server/repositories/*`에서만 직접 다룬다.

## 전환 상태

| 우선순위 | API 범주 | 상태 | 연결 방식 |
| --- | --- | --- | --- |
| 1 | 로그인 API | 완료 | route -> `clientPasswordServerService`, `clientEditorSession`, `clientEditorMobileApi` |
| 2 | 초안 생성 API | 완료 | route -> `invitationPageServerService`, `clientPasswordServerService`, `pageTicketServerService` |
| 3 | 청첩장 조회 API | 완료 | route -> `clientEditorMobileApi`, `invitationPageServerService` |
| 4 | 방명록 관리 API | 완료 | route -> `firestoreEventCommentRepository` |
| 5 | 링크 토큰 발급/검증 API | 완료 | route -> `mobileClientEditorLinkToken`, `mobileClientEditorHighRisk`, `clientEditorMobileApi` |
| 6 | 고위험 작업 API | 완료 | route -> `mobileClientEditorHighRisk`, `clientPasswordServerService`, `clientEditorMobileApi` |
| 7 | 결제 이행 API | 완료 | route -> `mobileBillingServerService` |
| 8 | 관리자 서버 조회/삭제 보조 서비스 | 완료 | service -> `admin*Repository` |
| 9 | API rate limit | 완료 | route -> `requestRateLimit` -> `rateLimitRepository` |

## 구 API / 신 repository 연결표

### 1. 로그인 API

- `src/app/api/client-editor/login/route.ts`
  - 기존 역할: `client-passwords`, 세션 발급
  - 현재 연결: `verifyServerClientPassword` -> `eventSecretRepository`
  - 세션 발급: `createClientEditorSessionValue`
- `src/app/api/mobile/client-editor/login/route.ts`
  - 현재 연결: `verifyServerClientPassword`, `loadMobileClientEditorPageSnapshot`
  - snapshot 내부: `eventRepository`, `eventCommentRepository`, `eventTicketRepository`

### 2. 초안 생성 API

- `src/app/api/mobile/client-editor/drafts/route.ts`
  - 현재 연결: `createServerInvitationPageDraftFromSeed`
  - draft 저장: `eventRepository.saveContentBySlug`, `eventRepository.upsertRegistryBySlug`
  - 비밀번호 저장: `setServerClientPassword` -> `eventSecretRepository`
- 웹 초안 생성 시작점
  - `/page-editor`, `/page-wizard`는 아직 브라우저 서비스 호출을 사용하지만, 서버 저장은 `invitationPageServerService` 경유로 repository에 연결된다.

### 3. 청첩장 조회 / 수정 API

- `src/app/api/client-editor/pages/[slug]/route.ts`
  - 현재 연결: `getServerEditableInvitationPageConfig`, `saveServerInvitationPageConfig`, `restoreServerInvitationPageConfig`, `setServerInvitationPagePublished`
- `src/app/api/mobile/client-editor/pages/[slug]/route.ts`
  - 현재 연결: `clientEditorMobileApi`, `invitationPageServerService`, `pageTicketServerService`
- `src/app/api/mobile/client-editor/pages/[slug]/dashboard/route.ts`
  - 현재 연결: `loadMobileClientEditorPageSnapshot`

### 4. 방명록 관리 API

- `src/app/api/client-editor/pages/[slug]/comments/[commentId]/route.ts`
- `src/app/api/mobile/client-editor/pages/[slug]/comments/[commentId]/route.ts`
  - 현재 연결: `firestoreEventCommentRepository`
  - `events/{eventId}/comments` 기준 soft delete / 상태 변경 처리

### 5. 링크 토큰 발급 / 검증 API

- `src/app/api/mobile/client-editor/link-tokens/route.ts`
  - 현재 연결: `issueMobileClientEditorLinkToken`, `revokeActiveMobileClientEditorLinkTokens`
  - 저장소: `eventLinkTokenRepository`
- `src/app/api/mobile/client-editor/link-tokens/exchange/route.ts`
  - 현재 연결: `exchangeMobileClientEditorLinkToken`
  - 저장소: `eventLinkTokenRepository`

### 6. 고위험 작업 API

- `src/app/api/mobile/client-editor/high-risk/verify/route.ts`
  - 현재 연결: `authorizeMobileClientEditorRequest`, `verifyServerClientPassword`, `createMobileClientEditorHighRiskSessionValue`
  - 감사 로그: `writeMobileClientEditorAuditLog` -> `eventAuditLogRepository`

### 7. 결제 이행 API

- `src/app/api/mobile/billing/fulfill/route.ts`
  - 현재 연결: `mobileBillingServerService`
  - 결제 기록 저장: `billingFulfillmentRepository`
  - 초안 생성/티켓 부여: `eventRepository`, `eventTicketRepository`, `eventSecretRepository`
  - 요청 제한: `requestRateLimit` -> `rateLimitRepository`

### 8. 관리자 서버 조회/삭제 보조 서비스

- `src/server/adminDashboardSummaryService.ts`
  - 현재 연결: `adminDashboardRepository`, `eventRepository`
- `src/server/adminEventDeletionService.ts`
  - 현재 연결: `adminEventDeletionRepository`
- `src/server/adminPasswordSummaryService.ts`
  - 현재 연결: `eventSecretRepository`, `eventRepository`
- `src/server/adminUserServerService.ts`
  - 현재 연결: `adminUserRepository`

### 9. API rate limit

- `src/server/requestRateLimit.ts`
  - 현재 연결: `rateLimitRepository`
  - Firestore 사용 가능 환경에서는 `rateLimits/{keyHash}`에 윈도우 상태를 저장한다.
  - Firebase 비활성 로컬 환경에서만 프로세스 메모리 fallback을 사용한다.

## 검증 기준

- `src/app/api` 안에서 `@/services/*` import가 없어야 한다.
- `src/app/api`, `src/server`(repository 제외) 안에서 `getServerFirestore`, `.collection(` 직접 호출이 없어야 한다.
- 위 조건은 `scripts/test-api-repository-boundary.mts`로 검증한다.

## 실행 명령

```bash
npm run test:api-repository-boundary
```

## 남은 범위

- 이번 단계는 **API 라우트 경계 정리**가 목적이다.
- 웹 관리자 UI와 `page-editor`, `page-wizard` 클라이언트가 브라우저 Firestore helper를 쓰는 부분은 10단계 이후 관리자 server auth 정리와 함께 별도 전환 대상이다.
