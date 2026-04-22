# Event Backfill Runbook

## 목적
- 기존 청첩장 전용 Firestore 데이터를 `events` 중심 구조로 안전하게 복제한다.
- 초기 운영 기준은 legacy 컬렉션을 source of truth로 유지하고, 백필은 `events` 구조를 채우는 작업으로만 취급한다.
- 스크립트는 idempotent merge write를 사용하므로 같은 slug를 반복 실행해도 같은 대상 문서를 갱신한다.

## 대상 매핑
- `invitation-page-configs/{pageSlug}` -> `events/{eventId}/content/current`
- `invitation-page-registry/{pageSlug}` -> `events/{eventId}`
- `display-periods/{pageSlug}` -> `events/{eventId}.displayPeriod`
- `client-passwords/{pageSlug}` -> `eventSecrets/{eventId}`
- `guestbooks/{pageSlug}/comments/{commentId}` -> `events/{eventId}/comments/{commentId}`
- `page-ticket-balances/{pageSlug}` -> `events/{eventId}.stats.ticketCount`
- `mobile-client-editor-link-tokens/{tokenId}` -> `events/{eventId}/linkTokens/{tokenId}`
- `mobile-client-editor-audit-logs/{logId}` -> `events/{eventId}/auditLogs/{logId}`
- `mobile-billing-fulfillments/{transactionId}` -> `billingFulfillments/{transactionId}`
- `eventSlugIndex/{slug}`는 모든 slug에 대해 함께 생성한다.

## 식별자 규칙
- `eventId`는 1차 마이그레이션 동안 `evt_${pageSlug}`로 생성한다.
- 외부 공개 주소는 기존 `pageSlug`를 `slug`로 유지한다.
- `eventSlugIndex/{slug}`가 이미 다른 active/redirect eventId를 가리키면 해당 slug는 실패로 기록하고 건너뛴다.
- `revoked` index는 재사용 가능 대상으로 본다.

## 실행 모드
- dry-run:
  - `npm run backfill:events -- dry-run`
  - 쓰기 없이 대상 slug와 예정 write 수만 계산한다.
- execute:
  - `npm run backfill:events -- execute`
  - legacy 데이터를 읽어 `events`, `eventSecrets`, `eventSlugIndex`, `billingFulfillments`에 병행 복제한다.
- validate:
  - `npm run backfill:events -- validate`
  - legacy 대상이 새 구조에 존재하는지 확인하고 누락 항목을 실패로 리포트한다.

## 옵션
- 특정 slug만 실행:
  - `npm run backfill:events -- dry-run --slug groom-bride`
- 일부만 샘플 실행:
  - `npm run backfill:events -- execute --limit 10`
- batch 크기 조정:
  - `npm run backfill:events -- execute --batch-size 300`

## 결과 로그 포맷
```json
{
  "generatedAt": "2026-04-22T00:00:00.000Z",
  "options": {
    "mode": "dry-run",
    "slug": null,
    "limit": 10,
    "batchSize": 400
  },
  "scannedSlugCount": 10,
  "counters": {
    "eventSummary": 10,
    "eventSlugIndex": 10,
    "eventContent": 10
  },
  "committedBatches": 0,
  "failures": [],
  "ok": true
}
```

## 실패 처리
- 실패는 `failures` 배열에 `{ target, id, reason }` 형태로 남긴다.
- `execute` 중 한 slug가 실패해도 나머지 slug는 계속 처리한다.
- 같은 slug 중복 실행은 merge write라 중복 문서를 만들지 않는다.
- slug index 충돌은 자동 덮어쓰지 않는다. 충돌 slug는 별도 확인 후 redirect/revoked 정책을 확정해야 한다.

## 검증
- 순수 변환 검증:
  - `npm run test:event-backfill`
- 실제 Firebase 대상 검증:
  - `npm run backfill:events -- validate`
