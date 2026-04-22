# Legacy -> Events 매핑 기록

## 목적
- 이벤트 도메인 legacy 컬렉션이 어떤 target 구조로 이관됐는지 1:1로 남긴다.
- 현재 runtime source of truth는 새 구조 하나이며, 이 문서는 이관 기록과 필드 책임 설명 용도로 유지한다.

## 현재 기준
- source of truth: `events/{eventId}`
- slug 해석: `eventSlugIndex/{slug}`
- 비밀번호: `eventSecrets/{eventId}`
- 결제: `billingFulfillments/{transactionId}`
- `memory-pages`는 별도 도메인 유지
- 이벤트 도메인 legacy 컬렉션은 제거 완료

## 컬렉션 매핑표

| legacy 경로 | target 경로 | 기준 키 | 현재 상태 |
| --- | --- | --- | --- |
| `invitation-page-configs/{slug}` | `events/{eventId}/content/current` | `slug -> eventId` | 제거 완료 |
| `invitation-page-registry/{slug}` | `events/{eventId}` | `slug -> eventId` | 제거 완료 |
| `display-periods/{slug}` | `events/{eventId}.visibility.*` | `slug -> eventId` | 제거 완료 |
| `client-passwords/{slug}` | `eventSecrets/{eventId}` | `slug -> eventId` | 제거 완료 |
| `guestbooks/{pageSlug}/comments/{commentId}` | `events/{eventId}/comments/{commentId}` | `pageSlug -> eventId` | 제거 완료 |
| `page-ticket-balances/{pageSlug}` | `events/{eventId}.stats.ticketBalance` | `pageSlug -> eventId` | 제거 완료 |
| `mobile-client-editor-link-tokens/{tokenId}` | `events/{eventId}/linkTokens/{tokenId}` | `pageSlug -> eventId` | migration 기록만 유지 |
| `mobile-client-editor-audit-logs/{logId}` | `events/{eventId}/auditLogs/{logId}` | `pageSlug -> eventId` | migration 기록만 유지 |
| `mobile-billing-fulfillments/{transactionId}` | `billingFulfillments/{transactionId}` | `transactionId` | runtime 의존 제거 |

## 핵심 필드 매핑

### 메타 / 공개 상태
- `invitation-page-registry.defaultTheme` -> `events.defaultTheme`
- `invitation-page-registry.published` -> `events.visibility.published`
- `display-periods.startDate` -> `events.visibility.displayStartAt`
- `display-periods.endDate` -> `events.visibility.displayEndAt`

### 본문
- `invitation-page-configs` 전체 본문 -> `events/{eventId}/content/current.content`
- theme/variant 정보 -> `events/{eventId}/content/current.themeState`

### 비밀번호
- `client-passwords.passwordHash` -> `eventSecrets.passwordHash`
- `client-passwords.passwordVersion` -> `eventSecrets.passwordVersion`

### 방명록
- `guestbooks/{pageSlug}/comments/*` -> `events/{eventId}/comments/*`
- `status`, `deletedAt`, `hiddenAt`, `scheduledDeleteAt`, `restoredAt`는 그대로 유지

### 티켓
- `page-ticket-balances.ticketCount` -> `events.stats.ticketBalance`

### 결제
- `mobile-billing-fulfillments.transactionId` -> `billingFulfillments/{transactionId}`
- `createdPageSlug`, `targetPageSlug`는 `eventId`로 역해석 후 `eventId`에 반영

## 현재 문서 해석 규칙
- legacy 컬렉션명은 이관 이력을 설명하는 데만 사용한다.
- 신규 기능 문서와 코드에서는 legacy 컬렉션명을 기준 저장소처럼 사용하지 않는다.
- 저장 구조를 설명할 때는 항상 `events`, `eventSecrets`, `eventSlugIndex`, `billingFulfillments`, `memory-pages`만 기준으로 본다.

## 제거 완료 컬렉션
- `invitation-page-configs`
- `invitation-page-registry`
- `display-periods`
- `client-passwords`
- `guestbooks`
- `page-ticket-balances`

이 컬렉션들은 2026-04-22 기준 운영 Firestore에서 삭제 완료했다.
