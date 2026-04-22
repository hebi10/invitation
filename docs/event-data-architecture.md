# 이벤트 데이터 아키텍처 전환 기준

## 목적
- 기존 청첩장 전용 Firestore 구조를 `events` 중심 구조로 확장 가능하게 정리한다.
- 내부 PK는 `eventId`, 외부 공개 주소는 `slug`로 분리한다.
- Expo와 Next의 기존 API 계약은 최대한 유지하고, 서버 저장소 계층에서 호환을 우선 처리한다.
- 한 번에 DB 경로를 교체하지 않고 `호환 계층 -> 병행 기록 -> 점진 이관` 순서로 전환한다.

## 핵심 식별자 규칙
- 내부 PK: `eventId`
  - Firestore 문서 식별자이자 내부 참조 키다.
  - 공개 URL, 앱 입력값, 사용자 문구에는 직접 노출하지 않는다.
- 외부 URL: `slug`
  - 공개 페이지, 모바일 연동, 운영 화면의 사용자 노출 주소다.
  - slug lookup은 `eventSlugIndex/{slug}`를 기준으로 처리한다.
- 기존 `pageSlug`는 전환 기간 동안만 호환 필드로 유지한다.
  - 서버 응답과 기존 API 파라미터에는 필요한 범위에서 계속 내려준다.
  - 신규 저장소 내부 기준 키로는 사용하지 않는다.

## 이벤트 타입
- `wedding`
  - 현재 청첩장 서비스 기본 타입이다.
- `birthday`
  - 돌잔치, 생일 초대장 확장 시 우선 사용한다.
- `etc`
  - 기타 행사 타입을 임시 수용하는 기본값이다.
- 원칙
  - 모든 이벤트 문서는 `eventType`을 필수로 가진다.
  - 테마, 필드, 공개 경로 정책은 `eventType` 기준으로 분기할 수 있어야 한다.

## slug 정책
- slug는 외부 공개 주소로 유지한다.
- 허용 문자는 기존 청첩장 주소 규칙을 그대로 사용한다.
  - 영문 소문자, 숫자, 하이픈(`-`)
- slug 중복 여부는 `eventSlugIndex/{slug}` 기준으로 확인한다.
- 기본 정책은 `slug 변경 비허용`으로 시작한다.
  - 전환 초기에는 `slug`를 안정 키처럼 다루는 편이 안전하다.
- 추후 slug 변경이 필요해지면 아래를 함께 도입한다.
  - `eventSlugAliases/{slug}` 또는 `eventSlugIndex` 내 alias 기록
  - 기존 slug 접근 시 리다이렉트 처리
  - 변경 이력과 충돌 방지 규칙

## 목표 컬렉션 구조

### 1. `events/{eventId}`
- 이벤트 요약 문서다.
- 공개 목록, 운영 목록, 권한 체크 이전 메타 로딩에 사용한다.
- 큰 본문이나 민감 정보는 넣지 않는다.

권장 필드:
- `eventId: string`
- `eventType: 'wedding' | 'birthday' | 'etc'`
- `slug: string`
- `displayName: string`
- `summary: string | null`
- `published: boolean`
- `defaultTheme: string`
- `featureFlags: Record<string, boolean | number | string>`
- `stats.commentCount: number`
- `stats.ticketCount: number`
- `displayPeriod.isActive: boolean`
- `displayPeriod.startDate: Timestamp | null`
- `displayPeriod.endDate: Timestamp | null`
- `hasCustomContent: boolean`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`
- `lastSavedAt: Timestamp | null`
- `migratedFromPageSlug: string | null`

### 2. `events/{eventId}/content/current`
- 실제 편집용 본문 문서다.
- 공개 렌더링과 편집 저장의 기준 원본이다.
- 현재 `InvitationPageSeed` 계열 데이터를 이 문서에 수용한다.

권장 필드:
- `schemaVersion: number`
- `eventType: string`
- `slug: string`
- `content: Record<string, unknown>`
- `themeState.defaultTheme: string`
- `themeState.variants: Record<string, unknown>`
- `productTier: string`
- `featureFlags: Record<string, boolean | number | string>`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

### 3. `events/{eventId}/comments/{commentId}`
- 공개 댓글/방명록 저장소다.
- 대량 문서가 쌓일 수 있으므로 요약 문서와 분리한다.

권장 필드:
- `eventId: string`
- `slug: string`
- `author: string`
- `message: string`
- `status: 'public' | 'hidden' | 'pending_delete'`
- `deleted: boolean`
- `createdAt: Timestamp`
- `hiddenAt: Timestamp | null`
- `deletedAt: Timestamp | null`
- `scheduledDeleteAt: Timestamp | null`
- `restoredAt: Timestamp | null`

### 4. `events/{eventId}/linkTokens/{tokenId}`
- 1회용 앱 연동 링크 저장소다.
- raw token은 저장하지 않고 `tokenHash`만 저장한다.

권장 필드:
- `eventId: string`
- `slug: string`
- `tokenHash: string`
- `purpose: 'mobile-login'`
- `passwordVersion: number`
- `createdAt: Timestamp`
- `expiresAt: Timestamp`
- `usedAt: Timestamp | null`
- `revokedAt: Timestamp | null`
- `lastValidatedAt: Timestamp | null`
- `issuedBy: string | null`
- `issuedByType: string | null`

### 5. `events/{eventId}/auditLogs/{logId}`
- 고위험 작업 감사 로그다.
- 운영 이력과 보안 분석 기준으로 사용한다.

권장 필드:
- `eventId: string`
- `slug: string`
- `action: string`
- `result: 'success' | 'failure'`
- `reason: string | null`
- `actor.type: string | null`
- `actor.sessionEventId: string | null`
- `metadata: Record<string, string | number | boolean | null>`
- `createdAt: Timestamp`

### 6. `eventSecrets/{eventId}`
- 민감 정보 전용 문서다.
- 이벤트 요약 문서와 물리적으로 분리한다.

권장 필드:
- `eventId: string`
- `slug: string`
- `passwordHash: string | null`
- `passwordSalt: string | null`
- `passwordIterations: number | null`
- `passwordVersion: number`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

### 7. `eventSlugIndex/{slug}`
- 공개 slug에서 `eventId`를 찾는 인덱스 문서다.
- slug uniqueness의 단일 기준점이다.

권장 필드:
- `slug: string`
- `eventId: string`
- `eventType: string`
- `status: 'active' | 'redirect' | 'revoked'`
- `targetSlug: string | null`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

### 8. `billingFulfillments/{transactionId}`
- 결제 이력과 중복 처리 방지용 전역 컬렉션이다.
- 이벤트 하위 문서가 아니라 `transactionId` 기준 전역 유니크 저장소로 둔다.

권장 필드:
- `transactionId: string`
- `appUserId: string`
- `productId: string`
- `kind: 'pageCreation' | 'ticketPack'`
- `status: 'processing' | 'fulfilled' | 'failed'`
- `createdEventId: string | null`
- `createdSlug: string | null`
- `targetEventId: string | null`
- `targetSlug: string | null`
- `grantedTicketCount: number | null`
- `purchaseDate: string | null`
- `lastError: string | null`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`
- `fulfilledAt: Timestamp | null`

## 컬렉션 책임표

| 저장 위치 | 책임 | 포함하면 안 되는 것 |
| --- | --- | --- |
| `events/{eventId}` | 목록/운영용 요약 메타 | 긴 본문, 비밀번호 해시, 대량 로그 |
| `events/{eventId}/content/current` | 실제 편집 본문 | 감사 로그, 링크 토큰 |
| `events/{eventId}/comments/{commentId}` | 방명록/댓글 상태 | 본문 전체, 권한 메타 |
| `events/{eventId}/linkTokens/{tokenId}` | 앱 연동용 1회 토큰 | raw token |
| `events/{eventId}/auditLogs/{logId}` | 고위험 작업 기록 | 본문 전체, 비밀번호 해시 |
| `eventSecrets/{eventId}` | 비밀번호/민감 정보 | 공개용 메타 |
| `eventSlugIndex/{slug}` | slug -> eventId 라우팅 | 본문, 댓글 |
| `billingFulfillments/{transactionId}` | 결제 멱등성, 이력 | 이벤트 본문 |

## 기존 컬렉션 매핑 초안

| 현재 컬렉션 | 목표 저장 위치 |
| --- | --- |
| `invitation-page-registry/{pageSlug}` | `events/{eventId}` |
| `invitation-page-configs/{pageSlug}` | `events/{eventId}/content/current` |
| `display-periods/{pageSlug}` | `events/{eventId}.displayPeriod` |
| `guestbooks/{pageSlug}/comments/{commentId}` | `events/{eventId}/comments/{commentId}` |
| `client-passwords/{pageSlug}` | `eventSecrets/{eventId}` |
| `page-ticket-balances/{pageSlug}` | `events/{eventId}.stats.ticketCount` 또는 별도 티켓 서브문서 |
| `mobile-client-editor-link-tokens/{tokenId}` | `events/{eventId}/linkTokens/{tokenId}` |
| `mobile-client-editor-audit-logs/{logId}` | `events/{eventId}/auditLogs/{logId}` |
| `mobile-billing-fulfillments/{transactionId}` | `billingFulfillments/{transactionId}` |

## 전환 원칙
- 기존 API 계약은 우선 유지한다.
  - Expo는 가능하면 `pageSlug` 기반 요청을 그대로 보내고, 서버에서 `slug -> eventId`를 해석한다.
- 서버 저장소 계층을 먼저 도입한다.
  - 라우트와 UI보다 저장/조회 서비스를 먼저 공통화한다.
- 전환 초기에는 `read-through + write-through` 전략을 사용한다.
  - 읽기: 신규 `events` 구조 우선, 없으면 기존 컬렉션 fallback
  - 쓰기: 신규 구조와 기존 구조에 병행 기록
- 마이그레이션 완료 후 기존 컬렉션 의존을 제거한다.
- 전환 중에도 공개 URL과 모바일 연동 주소는 기존 slug를 유지한다.

## 1단계 완료 기준
- 목표 컬렉션 구조가 문서로 고정되어 있다.
- `eventId`와 `slug`의 역할이 명확히 분리되어 있다.
- 각 문서가 무엇을 저장하고 무엇을 저장하지 않는지 정의되어 있다.
- 기존 컬렉션을 새 구조에 어떻게 대응시킬지 초안이 정리되어 있다.
