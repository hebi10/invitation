# Event Cutover Checklist

## 현재 상태
- source of truth: `events/{eventId}`
- slug 해석 기준: `eventSlugIndex/{slug}`
- 비밀번호 기준: `eventSecrets/{eventId}`
- 결제 기준: `billingFulfillments/{transactionId}`
- `memory-pages`는 별도 도메인 유지
- 이벤트 도메인 legacy 컬렉션 제거 완료

## 컷오버 완료 항목
- [x] `EVENT_ROLLOUT_WRITE_MODE=event-only` 기준 정리
- [x] `backfill:events -- dry-run`
- [x] `backfill:events -- execute`
- [x] `backfill:events -- validate`
- [x] `qa:event-rollout`
- [x] `monitor:event-rollout` baseline 0건 확인
- [x] `client-passwords` 삭제
- [x] `display-periods` 삭제
- [x] `invitation-page-registry` 삭제
- [x] `invitation-page-configs` 삭제
- [x] `guestbooks` 삭제
- [x] `page-ticket-balances` 삭제

## 삭제 후 기준
- 관리자, 공개 페이지, 모바일 운영은 새 구조만 기준으로 동작해야 한다.
- runtime과 rules는 삭제한 legacy 컬렉션명을 참조하지 않아야 한다.
- Firestore 복원은 `events`, `eventSecrets`, `eventSlugIndex`, `billingFulfillments` 기준으로 가능해야 한다.

## 운영 확인 항목
- `event-write-through-failures`
- `event-read-fallback-logs`
- `event-rollout-mismatches`
- 관리자 목록/저장
- 공개 페이지 접속
- 비밀번호 검증
- 모바일 재연동
- 티켓 처리
- 결제 이행

## 현재 운영 판단
- 자동 QA 게이트 통과
- 백필 validate 통과
- 모니터링 baseline 0건
- 이벤트 도메인 legacy 컬렉션 삭제 완료

## 남은 수동 확인
- 관리자 화면 실동작 확인
- 공개 페이지 실동작 확인
- 모바일 실동작 확인
- 결제/티켓 실환경 확인

## rollback 메모
- 이벤트 도메인 legacy 컬렉션은 이미 삭제했기 때문에 `legacy-primary`로 되돌리는 방식은 더 이상 유효하지 않다.
- 장애 시 rollback은 Firestore 백업/복원 또는 `events` 구조 재배포 기준으로 처리한다.

## 결론
- 컷오버는 완료 상태다.
- 이후 문서와 구현은 `events`, `eventSecrets`, `eventSlugIndex`, `billingFulfillments`, `memory-pages`만 기준으로 유지한다.
