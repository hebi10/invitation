# 이벤트 Firestore 기준 구조

## 목적
- 이벤트 도메인의 source of truth를 `events/{eventId}` 축으로 통일한다.
- 내부 PK는 `eventId`, 외부 주소는 `slug`로 분리한다.
- 비밀번호, 결제, 운영 로그, 링크 토큰은 역할별 문서로 분리한다.
- `memory-pages`는 이벤트 도메인과 합치지 않고 별도 도메인으로 유지한다.

## 기준 원칙
- 내부 기준 키: `eventId`
- 외부 공개 주소: `slug`
- 이벤트 타입 기준: `src/lib/eventTypes.ts`
- `slug` 해석: `eventSlugIndex/{slug}` -> `eventId`
- 본문 원본: `events/{eventId}/content/current`
- 민감 정보: `eventSecrets/{eventId}`
- 결제 이행: `billingFulfillments/{transactionId}`
- Firestore 저장 시간 타입: `Timestamp`

## 기준 저장 구조

### `events/{eventId}`
- 이벤트 메타, 공개 상태, 기간, 통계의 기준 요약 문서

권장 필드:
- `eventId`
- `eventType`
- `slug`
- `status`
- `title`
- `defaultTheme`
- `supportedVariants`
- `hasCustomConfig`
- `visibility.published`
- `visibility.displayStartAt`
- `visibility.displayEndAt`
- `stats.commentCount`
- `stats.ticketBalance`
- `createdAt`
- `updatedAt`
- `version`

### `events/{eventId}/content/current`
- 청첩장 본문 원본

권장 필드:
- `schemaVersion`
- `eventType`
- `slug`
- `content`
- `themeState`
- `productTier`
- `featureFlags`
- `createdAt`
- `updatedAt`

### `events/{eventId}/comments/{commentId}`
- 방명록/댓글

권장 필드:
- `author`
- `message`
- `createdAt`
- `status`
- `deletedAt`
- `hiddenAt`
- `scheduledDeleteAt`
- `restoredAt`

상태값:
- `public`
- `hidden`
- `pending_delete`

### `events/{eventId}/linkTokens/{tokenId}`
- 앱 1회용 연동 링크

권장 필드:
- `tokenHash`
- `purpose`
- `expiresAt`
- `createdAt`
- `usedAt`
- `revokedAt`

### `events/{eventId}/auditLogs/{logId}`
- 운영 추적, 고위험 작업 로그

권장 필드:
- `type`
- `actor`
- `payload`
- `createdAt`

### `eventSecrets/{eventId}`
- 편집 비밀번호 민감정보

권장 필드:
- `passwordHash`
- `passwordVersion`
- `passwordSalt`
- `passwordIterations`
- `updatedAt`

### `eventSlugIndex/{slug}`
- 공개 주소를 `eventId`로 해석하는 인덱스

권장 필드:
- `slug`
- `eventId`
- `eventType`
- `status`
- `targetSlug`
- `updatedAt`

### `billingFulfillments/{transactionId}`
- 결제 멱등성과 처리 상태

권장 필드:
- `transactionId`
- `eventId`
- `productType`
- `status`
- `provider`
- `fulfilledAt`
- `createdAt`
- `updatedAt`

### `memory-pages/{slug}`
- 추억 페이지 별도 도메인
- 이벤트 구조에 합치지 않는다.

## 해석 규칙
- 공개 URL은 항상 `slug`를 사용한다.
- `eventType`의 허용 key와 표시 메타는 `src/lib/eventTypes.ts`를 source of truth로 본다.
- 서버와 repository는 `eventSlugIndex/{slug}`를 먼저 읽고 `eventId`를 찾는다.
- 실제 이벤트 원본은 `events/{eventId}`와 그 하위 서브컬렉션에서만 읽고 쓴다.
- 고객 편집기, 관리자, 모바일 운영은 Firestore 경로를 직접 다루지 않고 repository/API를 통해 저장한다.

## 현재 운영 기준
- source of truth: `events/{eventId}`
- slug 해석 기준: `eventSlugIndex/{slug}`
- 비밀번호 기준: `eventSecrets/{eventId}`
- 결제 기준: `billingFulfillments/{transactionId}`
- 메모리 페이지 기준: `memory-pages/{slug}`
- 이벤트 도메인 legacy 컬렉션은 제거 완료 상태다.

## 완료 상태 메모
- `invitation-page-configs`
- `invitation-page-registry`
- `display-periods`
- `client-passwords`
- `guestbooks`
- `page-ticket-balances`

위 이벤트 도메인 legacy 컬렉션은 운영 Firestore에서 제거 완료했다. 현재 문서에서 남아 있는 legacy 명칭은 백필/이관 기록 설명 용도뿐이다.
