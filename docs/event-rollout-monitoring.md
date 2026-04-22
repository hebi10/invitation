# Event Rollout Monitoring

## 목적
- legacy 컬렉션 삭제 전에 짧은 운영 관찰 기간을 두고 `events` 기준 구조가 안정적으로 동작하는지 확인한다.
- write-through 실패, read fallback, mismatch가 새로 쌓이지 않는지 확인한다.

## 자동 점검 대상
- `event-write-through-failures`
- `event-read-fallback-logs`
- `event-rollout-mismatches`

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

## 수동 확인 대상
1. 관리자 페이지
   - 목록 조회, 상세 진입, 공개 상태 저장, 기간 저장이 정상 동작하는지 확인
2. 공개 페이지
   - slug 진입, 본문 렌더링, 방명록 조회/작성에 오류가 없는지 확인
3. 모바일
   - 로그인/연동, 운영 화면, 방명록 관리, 링크 기반 재진입이 정상 동작하는지 확인

## 관찰 기간 권장안
- 최소: 24시간
- 권장: 48~72시간
- 관찰 기간 동안 신규 오류가 0건이면 legacy 제거 단계로 넘어간다.

## 장애 시 조치
1. `event-write-through-failures`가 생기면 payload와 `sourceOfTruth`, `operation`을 확인한다.
2. `event-read-fallback-logs`가 생기면 어떤 domain이 아직 legacy 읽기를 타는지 확인한다.
3. `event-rollout-mismatches`가 생기면 mismatch 필드와 lookup 값을 기준으로 데이터 정합성을 점검한다.
4. 관리자/공개/모바일에서 화면 오류가 있으면 해당 시점과 slug를 기준으로 위 세 컬렉션을 같이 확인한다.

## 완료 기준
- 관찰 기간 동안 `event-write-through-failures`, `event-read-fallback-logs`, `event-rollout-mismatches`에 신규 문서가 쌓이지 않는다.
- 관리자, 공개 페이지, 모바일 주요 흐름에서 legacy 의존 오류가 재현되지 않는다.
