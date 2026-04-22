# 현재 Firestore 구조 -> `events` 목표 스키마 매핑표

## 목적
- 현재 Firestore 경로를 전수 조사하고, 각 데이터가 `events` 목표 스키마 어디로 이동하는지 정리한다.
- Next 서버/웹 서비스/관리 API 중 Firestore 경로가 직접 박혀 있는 파일을 식별한다.
- 마이그레이션 구현 전에 필드 이전 규칙과 누락/불명확 데이터를 문서로 고정한다.

## 범위
- 포함
  - 페이지 본문
  - 페이지 레지스트리
  - 노출 기간
  - 비밀번호
  - 방명록
  - 티켓
  - 결제 이행
  - 1회용 링크
  - 감사 로그
- 제외
  - `memory-pages` 계열 추억 페이지 데이터
  - Firebase Storage 이미지 바이너리 경로 자체

## 현재 Firestore 경로 전수 조사

| 현재 경로 | 문서 키 기준 | 현재 책임 | 대표 접근 파일 | 목표 경로 |
| --- | --- | --- | --- | --- |
| `invitation-page-configs/{pageSlug}` | `pageSlug` | 청첩장 편집 본문 원본 | `src/server/invitationPageServerService.ts`, `src/services/invitationPageService.ts` | `events/{eventId}/content/current` |
| `invitation-page-registry/{pageSlug}` | `pageSlug` | 공개 여부, 기본 테마, 커스텀 설정 여부, 저장 시간 | `src/server/invitationPageServerService.ts`, `src/services/invitationPageService.ts` | `events/{eventId}` |
| `display-periods/{pageSlug}` | `pageSlug` 또는 `pageSlug` 필드 query | 공개 기간 | `src/server/invitationPageServerService.ts`, `src/services/invitationPageService.ts` | `events/{eventId}.displayPeriod` |
| `client-passwords/{pageSlug}` | `pageSlug` | 편집 비밀번호 해시/버전 | `src/server/clientPasswordServerService.ts`, `src/services/passwordService.ts` | `eventSecrets/{eventId}` |
| `client-access/{pageSlug}` | `pageSlug` | 레거시 접근 문서, 현재는 삭제 대상 | `src/services/passwordService.ts` | 마이그레이션 제외 후 제거 |
| `guestbooks/{pageSlug}/comments/{commentId}` | `pageSlug`, `commentId` | 방명록/댓글 | `src/server/clientEditorMobileApi.ts`, `src/services/commentService.ts`, `src/app/api/client-editor/pages/[slug]/comments/[commentId]/route.ts`, `src/app/api/mobile/client-editor/pages/[slug]/comments/[commentId]/route.ts` | `events/{eventId}/comments/{commentId}` |
| `page-ticket-balances/{pageSlug}` | `pageSlug` | 현재 티켓 잔액 | `src/server/pageTicketServerService.ts` | `events/{eventId}.stats.ticketCount` |
| `mobile-billing-fulfillments/{transactionId}` | `transactionId` | 결제 멱등성, 처리 상태, 생성/대상 slug 기록 | `src/server/mobileBillingServerService.ts` | `billingFulfillments/{transactionId}` |
| `mobile-client-editor-link-tokens/{tokenId}` | 임의 `tokenId` | 앱 1회용 연동 링크 토큰 | `src/server/mobileClientEditorLinkToken.ts` | `events/{eventId}/linkTokens/{tokenId}` |
| `mobile-client-editor-audit-logs/{logId}` | 임의 `logId` | 고위험 작업 감사 로그 | `src/server/mobileClientEditorHighRisk.ts` | `events/{eventId}/auditLogs/{logId}` |

## 직접 경로 하드코딩 파일 목록

### 상수 기반 컬렉션 접근
- `src/server/invitationPageServerService.ts`
  - `invitation-page-configs`
  - `invitation-page-registry`
  - `display-periods`
- `src/services/invitationPageService.ts`
  - `invitation-page-configs`
  - `invitation-page-registry`
  - `display-periods`
- `src/server/clientPasswordServerService.ts`
  - `client-passwords`
- `src/services/passwordService.ts`
  - `client-passwords`
  - `client-access`
- `src/server/pageTicketServerService.ts`
  - `page-ticket-balances`
- `src/server/mobileBillingServerService.ts`
  - `mobile-billing-fulfillments`
- `src/server/mobileClientEditorLinkToken.ts`
  - `mobile-client-editor-link-tokens`
- `src/server/mobileClientEditorHighRisk.ts`
  - `mobile-client-editor-audit-logs`

### literal path 하드코딩
- `src/server/clientEditorMobileApi.ts`
  - `.collection('guestbooks').doc(pageSlug).collection('comments')`
- `src/services/commentService.ts`
  - `guestbooks/{pageSlug}/comments`
- `src/app/api/client-editor/pages/[slug]/comments/[commentId]/route.ts`
  - `.collection('guestbooks')`
- `src/app/api/mobile/client-editor/pages/[slug]/comments/[commentId]/route.ts`
  - `.collection('guestbooks')`

### 영향 범위 메모
- Expo 앱은 Firestore 컬렉션명을 직접 쓰지 않는다.
- Expo는 대부분 Next API 계약에 의존하므로, 저장소 전환 1차 영향은 서버/웹 서비스 쪽이 크다.

## 컬렉션 매핑표

| 현재 컬렉션/경로 | 목표 경로 | 전환 방식 | 비고 |
| --- | --- | --- | --- |
| `invitation-page-configs/{pageSlug}` | `events/{eventId}/content/current` | 전체 본문 이관 | 현재 `InvitationPageSeed` 계열을 `content` 중심으로 옮긴다. |
| `invitation-page-registry/{pageSlug}` | `events/{eventId}` | 메타 병합 | 공개 여부, 테마, 저장 시각, 커스텀 여부를 요약 문서로 이동한다. |
| `display-periods/{pageSlug}` | `events/{eventId}.displayPeriod` | 필드 병합 | 별도 컬렉션 대신 요약 문서의 하위 필드로 접는다. |
| `client-passwords/{pageSlug}` | `eventSecrets/{eventId}` | 보안 문서 이관 | `pageSlug` 중심 문서를 `eventId` 중심 보안 문서로 이동한다. |
| `client-access/{pageSlug}` | 제거 | 이관 없음 | 레거시 접근 문서는 삭제 대상이다. |
| `guestbooks/{pageSlug}/comments/{commentId}` | `events/{eventId}/comments/{commentId}` | 서브컬렉션 이동 | commentId는 가능하면 유지한다. |
| `page-ticket-balances/{pageSlug}` | `events/{eventId}.stats.ticketCount` | 값 병합 | 현재는 잔액만 있으므로 요약 문서에 흡수한다. |
| `mobile-billing-fulfillments/{transactionId}` | `billingFulfillments/{transactionId}` | 전역 컬렉션 유지 + 필드 rename | `transactionId` 기준 전역 컬렉션은 그대로 유지한다. |
| `mobile-client-editor-link-tokens/{tokenId}` | `events/{eventId}/linkTokens/{tokenId}` | 서브컬렉션 이동 | `tokenId` 유지 가능, raw token은 계속 저장 금지다. |
| `mobile-client-editor-audit-logs/{logId}` | `events/{eventId}/auditLogs/{logId}` | 서브컬렉션 이동 | action/result/reason/metadata는 유지한다. |

## 필드 이전 규칙표

### 1. `invitation-page-registry/{pageSlug}` -> `events/{eventId}`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `pageSlug` | `slug` | 그대로 이동 |
| `published` | `published` | 그대로 이동 |
| `defaultTheme` | `defaultTheme` | 그대로 이동 |
| `hasCustomConfig` | `hasCustomContent` | 이름만 변경 |
| `createdAt` | `createdAt` | 그대로 이동 |
| `updatedAt` | `updatedAt` | 그대로 이동 |
| 없음 | `eventId` | 마이그레이션 시 신규 생성 |
| 없음 | `eventType` | 기본값 `wedding` |
| 없음 | `displayName`, `summary`, `stats.*`, `lastSavedAt` | 본문/티켓/댓글 집계로 보강 |
| `editorTokenHash` | 삭제 | 더 이상 사용하지 않음 |

### 2. `invitation-page-configs/{pageSlug}` -> `events/{eventId}/content/current`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `slug` | `slug` | 그대로 이동 |
| 문서 전체 `InvitationPageSeed` 필드 | `content` | 본문 전체를 `content` 하위로 이동 |
| `productTier` | `productTier` | 요약/본문 양쪽에서 참조 가능하도록 유지 |
| `features` | `featureFlags` | 이름만 정리 |
| `variants` | `themeState.variants` | 구조화 이동 |
| `createdAt` | `createdAt` | 그대로 이동 |
| `updatedAt` | `updatedAt` | 그대로 이동 |
| `seedSourceSlug` | `content.seedSourceSlug` 또는 `migrationMeta.seedSourceSlug` | seed 추적용이면 유지 |
| `editorTokenHash` | 삭제 | 더 이상 사용하지 않음 |
| 없음 | `schemaVersion` | 신규 필드, 초기값 `1` 권장 |
| 없음 | `eventType` | 기본값 `wedding` |

### 3. `display-periods/{pageSlug}` -> `events/{eventId}.displayPeriod`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `pageSlug` | `slug` | 이벤트 요약 문서의 slug와 정합성 확인 후 이동 |
| `isActive` | `displayPeriod.isActive` | 그대로 이동 |
| `startDate` | `displayPeriod.startDate` | 그대로 이동 |
| `endDate` | `displayPeriod.endDate` | 그대로 이동 |
| `createdAt` | `displayPeriod.createdAt` 또는 `migrationMeta.displayPeriodCreatedAt` | 운영 필요 시만 유지 |
| `updatedAt` | `displayPeriod.updatedAt` 또는 `lastSavedAt` | 운영 필요 시만 유지 |

### 4. `client-passwords/{pageSlug}` -> `eventSecrets/{eventId}`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `pageSlug` | `slug` | 그대로 이동 |
| `passwordHash` | `passwordHash` | 그대로 이동 |
| `passwordSalt` | `passwordSalt` | 그대로 이동 |
| `passwordIterations` | `passwordIterations` | 그대로 이동 |
| `passwordVersion` | `passwordVersion` | 그대로 이동 |
| `createdAt` | `createdAt` | 그대로 이동 |
| `updatedAt` | `updatedAt` | 그대로 이동 |
| `password` | 제거 또는 hash 업그레이드 후 삭제 | legacy 평문이면 마이그레이션 중 해시화 후 제거 |
| `editorTokenHash` | 삭제 | 더 이상 사용하지 않음 |
| 없음 | `eventId` | 신규 생성 |

### 5. `guestbooks/{pageSlug}/comments/{commentId}` -> `events/{eventId}/comments/{commentId}`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `pageSlug` | `slug` | 그대로 이동 |
| `author` | `author` | 그대로 이동 |
| `message` | `message` | 그대로 이동 |
| `status` | `status` | 그대로 이동 |
| `deleted` | `deleted` | 그대로 이동 |
| `createdAt` | `createdAt` | 그대로 이동 |
| `hiddenAt` | `hiddenAt` | 그대로 이동 |
| `deletedAt` | `deletedAt` | 그대로 이동 |
| `scheduledDeleteAt` | `scheduledDeleteAt` | 그대로 이동 |
| `restoredAt` | `restoredAt` | 그대로 이동 |
| 없음 | `eventId` | slug 인덱스로 역해석해 채운다 |

### 6. `page-ticket-balances/{pageSlug}` -> `events/{eventId}.stats.ticketCount`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `pageSlug` | `slug` | 그대로 이동 |
| `ticketCount` | `stats.ticketCount` | 그대로 이동 |
| `updatedAt` | `stats.ticketUpdatedAt` 또는 `updatedAt` 보정 참고값 | 필요 시만 유지 |

### 7. `mobile-billing-fulfillments/{transactionId}` -> `billingFulfillments/{transactionId}`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `transactionId` | `transactionId` | 그대로 유지 |
| `appUserId` | `appUserId` | 그대로 유지 |
| `productId` | `productId` | 그대로 유지 |
| `kind` | `kind` | 그대로 유지 |
| `status` | `status` | 그대로 유지 |
| `createdAt` | `createdAt` | 그대로 유지 |
| `updatedAt` | `updatedAt` | 그대로 유지 |
| `fulfilledAt` | `fulfilledAt` | 그대로 유지 |
| `purchaseDate` | `purchaseDate` | 그대로 유지 |
| `createdPageSlug` | `createdSlug` | 이름 변경 |
| `targetPageSlug` | `targetSlug` | 이름 변경 |
| `grantedTicketCount` | `grantedTicketCount` | 그대로 유지 |
| `lastError` | `lastError` | 그대로 유지 |
| 없음 | `createdEventId`, `targetEventId` | slug 인덱스 역해석으로 신규 채움 |

### 8. `mobile-client-editor-link-tokens/{tokenId}` -> `events/{eventId}/linkTokens/{tokenId}`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `pageSlug` | `slug` | 그대로 이동 |
| `tokenHash` | `tokenHash` | 그대로 이동 |
| `purpose` | `purpose` | 그대로 이동 |
| `passwordVersion` | `passwordVersion` | 그대로 이동 |
| `createdAt` | `createdAt` | 그대로 이동 |
| `expiresAt` | `expiresAt` | 그대로 이동 |
| `usedAt` | `usedAt` | 그대로 이동 |
| `revokedAt` | `revokedAt` | 그대로 이동 |
| `lastValidatedAt` | `lastValidatedAt` | 그대로 이동 |
| `issuedBy` | `issuedBy` | 그대로 이동 |
| `issuedByType` | `issuedByType` | 그대로 이동 |
| 없음 | `eventId` | slug 인덱스로 역해석해 채움 |

### 9. `mobile-client-editor-audit-logs/{logId}` -> `events/{eventId}/auditLogs/{logId}`

| 현재 필드 | 목표 필드 | 규칙 |
| --- | --- | --- |
| `pageSlug` | `slug` | 그대로 이동 |
| `action` | `action` | 그대로 이동 |
| `result` | `result` | 그대로 이동 |
| `reason` | `reason` | 그대로 이동 |
| `metadata` | `metadata` | 그대로 이동 |
| `createdAt` | `createdAt` | 그대로 이동 |
| `sessionPageSlug` | `actor.sessionSlug` | actor 하위로 구조화 |
| 없음 | `eventId` | slug 인덱스로 역해석해 채움 |
| 없음 | `actor.sessionEventId` | `sessionPageSlug`가 있으면 추가 역해석 |

## 누락/불명확 필드 목록

### 1. `client-access` 레거시 컬렉션
- `src/services/passwordService.ts`에서 삭제 대상으로만 쓰인다.
- 현재 운영 로직 기준 실사용 데이터로 보이지 않는다.
- 신규 `events` 구조에는 이관하지 않고, 마이그레이션 후 제거 대상으로 본다.

### 2. `editorTokenHash`
- `invitation-page-configs`, `invitation-page-registry`, `client-passwords` 저장 시 삭제 필드로 처리된다.
- 현재 구조에서 사실상 폐기된 필드다.
- 새 구조에는 이관하지 않는다.

### 3. `client-passwords`의 legacy 평문 `password`
- 일부 문서는 `passwordHash/passwordSalt/passwordIterations` 대신 평문 `password`를 가질 수 있다.
- 마이그레이션 시 반드시 해시로 업그레이드한 뒤 `eventSecrets`에 저장해야 한다.
- 평문을 그대로 복사하면 안 된다.

### 4. `display-periods` 중복 문서 가능성
- 현재 코드는 doc id 직접 조회 후 `pageSlug` query fallback을 같이 한다.
- 즉, `docId !== pageSlug`인 중복/레거시 문서가 있을 수 있다.
- 마이그레이션 시 최신 우선 규칙이 필요하다.

### 5. `client-passwords` 중복 문서 가능성
- 현재 코드도 direct doc + `where('pageSlug', '==', slug)` fallback을 같이 쓴다.
- `pageSlug` 필드 기준 중복 레코드가 존재할 수 있으므로 최신 우선 선택 규칙이 필요하다.

### 6. `page-ticket-balances`의 이력 부재
- 현재는 잔액만 있고 증가/차감 이력은 별도 저장하지 않는다.
- 새 구조에서 운영 이력까지 필요하면 `events/{eventId}/ticketLogs/{logId}`를 추후 추가한다.

### 7. `mobile-billing-fulfillments`의 `createdPageSlug` / `targetPageSlug`
- 새 구조에서는 `createdEventId` / `targetEventId`도 같이 필요하다.
- slug 인덱스가 없는 과거 데이터는 역해석이 실패할 수 있으므로 unresolved 목록이 필요하다.

### 8. 댓글 문서의 `pageSlug` 누락 가능성
- 클라이언트 쪽 `commentService`는 일부 조회 시 `pageSlug`를 옵션으로 보정한다.
- 실제 문서에 `pageSlug`가 누락된 레거시 댓글이 있을 수 있으므로, 상위 경로의 slug를 우선 신뢰하는 보정이 필요하다.

## 구현 전 체크 포인트
- `eventSlugIndex/{slug}`를 먼저 채워야 댓글/비밀번호/링크/로그를 `eventId`로 역해석할 수 있다.
- `events/{eventId}` 요약 문서는 `registry + displayPeriod + ticketCount + commentCount`를 합쳐 생성한다.
- Next 서버는 먼저 repository 계층에서 기존 경로와 새 경로를 병행 지원하고, Expo는 기존 API 계약을 유지한 채 따라가야 한다.

## 2단계 완료 기준
- 기존 Firestore 경로가 새 구조 어디로 이동하는지 전부 설명할 수 있다.
- 각 컬렉션의 필드가 어떤 이름으로 바뀌는지 정의되어 있다.
- 직접 경로 하드코딩된 파일이 식별되어 후속 리팩터링 범위가 명확하다.
- 레거시/불명확 필드와 unresolved 처리 대상이 문서화되어 있다.
