# Event Rollout Monitoring

## 현재 상태
- 이 문서는 컷오버 전 관찰 문서였고, 지금은 회귀 점검/장애 분석용으로 유지한다.
- 컷오버 완료 여부는 `event-cutover-checklist.md`가 기준이다.

## 자동 점검 대상
- `event-write-through-failures`
- `event-read-fallback-logs`
- `event-rollout-mismatches`
- `rateLimits`는 API rate limit 윈도우 저장소이며, TTL 정책과 쓰기 지연을 운영 모니터링 대상으로 본다.

## 실행 명령
- 최근 24시간 기준
  - `npm run monitor:event-rollout`
- 최근 72시간 기준
  - `npm run monitor:event-rollout -- --hours 72`
- 최신 샘플 개수 조정
  - `npm run monitor:event-rollout -- --hours 24 --latest 10`

## 기대 기준
- `event-write-through-failures.count == 0`
- `event-read-fallback-logs.count == 0`
- `event-rollout-mismatches.count == 0`
- rate limit 적용 지연 로그(`[rate-limit] slow Firestore rate limit apply`)가 반복되지 않음

## 장애 시 확인 순서
1. `event-write-through-failures`가 생기면 payload, `sourceOfTruth`, `operation`을 확인한다.
2. `event-read-fallback-logs`가 생기면 어떤 domain이 fallback을 타는지 확인한다.
3. `event-rollout-mismatches`가 생기면 mismatch 필드와 lookup 값을 기준으로 데이터 정합성을 점검한다.
4. 관리자/공개/모바일 화면 오류가 있으면 해당 시점과 slug를 기준으로 위 세 컬렉션을 같이 확인한다.
5. 429가 비정상적으로 늘거나 rate limit 지연 로그가 반복되면 `rateLimits` write 지연과 Firestore 비용을 확인한다.

## 주의
- 현재 기본 운영 모드는 `event-only`다.
- legacy 컬렉션 삭제 이후에는 `legacy-primary` rollback을 전제로 장애 대응하지 않는다.
