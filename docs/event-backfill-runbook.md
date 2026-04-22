# Event Backfill Runbook

## 목적
- 기존 청첩장 운영 데이터를 `events` 중심 구조로 안전하게 복제한다.
- 백필은 idempotent merge write로 설계한다. 같은 slug를 다시 실행해도 같은 문서를 갱신한다.

## 매핑 대상
- `invitation-page-configs/{pageSlug}` -> `events/{eventId}/content/current`
- `invitation-page-registry/{pageSlug}` -> `events/{eventId}`
- `display-periods/{pageSlug}` -> `events/{eventId}.visibility`, `events/{eventId}.displayPeriod`
- `client-passwords/{pageSlug}` -> `eventSecrets/{eventId}`
- `guestbooks/{pageSlug}/comments/{commentId}` -> `events/{eventId}/comments/{commentId}`
- `page-ticket-balances/{pageSlug}` -> `events/{eventId}.stats.ticketBalance`
- `mobile-client-editor-link-tokens/{tokenId}` -> `events/{eventId}/linkTokens/{tokenId}`
- `mobile-client-editor-audit-logs/{logId}` -> `events/{eventId}/auditLogs/{logId}`
- `mobile-billing-fulfillments/{transactionId}` -> `billingFulfillments/{transactionId}`
- `eventSlugIndex/{slug}`는 모든 slug에 대해 함께 생성한다.

## eventId 규칙
- 1차 마이그레이션은 `evt_${pageSlug}`를 사용한다.
- 공개 주소는 계속 `slug`를 사용하고, 내부 기준 키만 `eventId`로 올린다.

## 실행 모드
- dry-run
  - `npm run backfill:events -- dry-run`
  - 쓰기 없이 대상 slug, write 개수, skip/failure만 계산한다.
- execute
  - `npm run backfill:events -- execute`
  - 신규 구조에 실제로 merge write 한다.
- validate
  - `npm run backfill:events -- validate`
  - 신규 구조 문서 존재와 필드 일치 여부를 검사한다.

## 옵션
- 특정 slug만 실행
  - `npm run backfill:events -- execute --slug groom-bride`
- 중간부터 재개
  - `npm run backfill:events -- execute --resume-from lee-junho-park-somin`
- 일부 샘플만 실행
  - `npm run backfill:events -- dry-run --limit 10`
- 배치 크기 조정
  - `npm run backfill:events -- execute --batch-size 300`

## validate 항목
- 구조 검증
  - `events/{eventId}`
  - `eventSlugIndex/{slug}`
  - `events/{eventId}/content/current`
  - `eventSecrets/{eventId}`
  - `events/{eventId}/comments/*`
  - `events/{eventId}/linkTokens/*`
  - `events/{eventId}/auditLogs/*`
  - `billingFulfillments/{transactionId}`
- 필드 검증
  - published/defaultTheme/displayPeriod
  - content/current 주요 본문 필드
  - passwordHash/passwordVersion
  - comment/linkToken/auditLog payload subset
  - ticketBalance
  - billing eventId/status 관련 필드

## 결과 로그 형식
```json
{
  "generatedAt": "2026-04-22T00:00:00.000Z",
  "options": {
    "mode": "validate",
    "slug": null,
    "resumeFrom": null,
    "limit": 10,
    "batchSize": 400
  },
  "scannedSlugCount": 10,
  "counters": {
    "validatedSlug": 10,
    "validSlug": 10,
    "failedSlug": 0,
    "validatedBillingFulfillment": 4,
    "failure": 0
  },
  "committedBatches": 0,
  "failures": [],
  "ok": true
}
```

## 실패 처리
- 실패는 `failures: [{ target, id, reason }]` 형식으로 출력한다.
- slug index 충돌, 누락 문서, 필드 mismatch를 구분해서 확인한다.
- `execute` 중 일부 slug가 실패해도 나머지 slug는 계속 진행한다.

## 권장 순서
1. `dry-run --limit 10`
2. `execute --limit 10`
3. `validate --limit 10`
4. 전체 `execute`
5. 전체 `validate`

## 참고
- 스크립트 자체 검증: `npm run test:event-backfill`
