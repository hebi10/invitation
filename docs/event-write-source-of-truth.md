# Event Write Source Of Truth

## 목적
- 신규 생성·수정 데이터의 기준 저장소를 `events/{eventId}` 축으로 고정한다.
- legacy 컬렉션은 마이그레이션 검증, 백필, 롤백 분석 용도로만 남기고 신규 런타임 경로에서는 직접 쓰지 않는다.

## 현재 기본 정책
- 기본 쓰기 모드: `EVENT_ROLLOUT_WRITE_MODE=event-only`
- 기본 읽기 모드: `events` 우선, 필요할 때만 legacy fallback
- 롤백이 필요할 때만 아래 env를 명시적으로 켠다.
  - `EVENT_ROLLOUT_WRITE_MODE=legacy-primary`
  - `EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK=true`
  - `EVENT_ROLLOUT_LEGACY_READ_FALLBACK_UNTIL=<ISO datetime>`

## 신규 기준 저장 경로
- 이벤트 메타 / 공개 상태 / 기간: `events/{eventId}`
- 본문: `events/{eventId}/content/current`
- 비밀번호: `eventSecrets/{eventId}`
- 댓글: `events/{eventId}/comments/{commentId}`
- 앱 연동 링크: `events/{eventId}/linkTokens/{tokenId}`
- 감사 로그: `events/{eventId}/auditLogs/{logId}`
- 티켓 잔액: `events/{eventId}.stats.ticketBalance`
- 결제 이행: `billingFulfillments/{transactionId}`
- slug 조회: `eventSlugIndex/{slug}`

## 티켓 / 결제 특수 경로 기준
- 서버 런타임은 더 이상 `page-ticket-balances`를 읽거나 쓰지 않는다.
- 서버 런타임은 더 이상 `mobile-billing-fulfillments`를 읽거나 쓰지 않는다.
- 티켓은 `events.stats.ticketBalance`만 source of truth로 사용한다.
- 결제 이행은 `billingFulfillments`만 source of truth로 사용한다.
- 위 legacy 컬렉션은 백필 이력 검토와 제거 계획 수립 전까지만 유지한다.

## 관측 컬렉션
- fallback 사용 로그: `event-read-fallback-logs`
- preferred / fallback 불일치 로그: `event-rollout-mismatches`
- 병행 쓰기 실패 로그: `event-write-through-failures`

## 남아 있는 legacy 컬렉션
- `invitation-page-configs`
- `invitation-page-registry`
- `display-periods`
- `client-passwords`
- `guestbooks/{pageSlug}/comments`
- `mobile-client-editor-link-tokens`
- `mobile-client-editor-audit-logs`
- `page-ticket-balances`
- `mobile-billing-fulfillments`

## 검증 명령
- `npm run typecheck:web`
- `npm run lint:web`
- `npm run test:service-repository-boundary`
- `npm run test:api-repository-boundary`
- `npm run test:event-write-paths`
- `npm run test:readthrough-repositories`
- `npm run test:write-through-repositories`
