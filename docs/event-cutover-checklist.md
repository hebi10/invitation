# Event Cutover Checklist

## 목적
- `events` 구조를 실제 운영 기준으로 승격할 때 필요한 설정, 점검 항목, 롤백 기준을 한 문서에 정리한다.
- 코드 기본값은 여전히 안전한 `legacy-primary` 모드로 두고, 운영 환경에서만 단계적으로 컷오버한다.

## 현재 코드 기준
- 읽기:
  - `events` 우선 조회
  - 필요 시 legacy fallback
  - fallback 종료는 `EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK`, `EVENT_ROLLOUT_LEGACY_READ_FALLBACK_UNTIL`로 제어
- 쓰기:
  - 기본값 `EVENT_ROLLOUT_WRITE_MODE=legacy-primary`
  - 컷오버 시 `EVENT_ROLLOUT_WRITE_MODE=event-only`
- partial failure 로그:
  - `event-write-through-failures`

## 운영 환경 변수
- `EVENT_ROLLOUT_WRITE_MODE`
  - `legacy-primary`: 기존 컬렉션 기준 저장 + `events` mirror
  - `event-only`: `events` 구조만 저장, legacy write 중단
- `EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK`
  - `true` 또는 `false`
  - 명시적으로 `false`면 legacy fallback 즉시 중단
- `EVENT_ROLLOUT_LEGACY_READ_FALLBACK_UNTIL`
  - ISO datetime
  - 지정 시 해당 시점까지만 legacy fallback 허용

## 권장 컷오버 순서
1. `legacy-primary` 유지 + `qa:event-rollout` 통과
2. backfill `dry-run -> execute -> validate`
3. 운영 데이터 기준 대표 시나리오 수동 QA
4. `event-write-through-failures`가 비어 있거나 관리 가능한 수준인지 확인
5. 운영 환경에서 `EVENT_ROLLOUT_WRITE_MODE=event-only` 전환
6. fallback 유지 기간 설정
   - 예: `EVENT_ROLLOUT_LEGACY_READ_FALLBACK_UNTIL=2026-05-31T00:00:00.000Z`
7. fallback 기간 동안 신규 쓰기/기존 조회/딥링크/결제 이행 모니터링
8. 문제 없으면 `EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK=false`
9. 충분한 기간 후 legacy 코드와 컬렉션 의존 제거

## 컷오버 체크리스트
- [ ] `npm run qa:event-rollout` 성공
- [ ] `npm run test:smoke` 성공 또는 대체 빌드 검증 경로 확보
- [ ] `backfill:events -- dry-run` 결과 검토
- [ ] `backfill:events -- execute` 완료
- [ ] `backfill:events -- validate` 완료
- [ ] `event-write-through-failures` 잔여 항목 정리
- [ ] 기존 청첩장 로그인/편집 수동 QA 완료
- [ ] 신규 이벤트 생성/slug 조회 수동 QA 완료
- [ ] 모바일 재연동 / 링크 토큰 만료 / 재사용 차단 확인
- [ ] 결제 이행 중복 호출 차단 확인
- [ ] 운영 환경 변수 변경 계획 공유 완료

## 롤백 계획
### 즉시 롤백 조건
- 기존 청첩장 로그인 또는 편집 실패
- 신규 이벤트 생성 후 재조회 실패
- 링크 토큰 재사용 또는 만료 처리 실패
- 결제 이행 중복 차단 실패
- `event-write-through-failures`가 급증하거나 복구 불가 상태

### 롤백 절차
1. `EVENT_ROLLOUT_WRITE_MODE=legacy-primary`로 되돌린다.
2. `EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK=true`로 유지한다.
3. 장애 시간대의 `event-write-through-failures`와 운영 로그를 수집한다.
4. 필요 시 `backfill:events -- validate`로 신규 구조 데이터 상태를 재확인한다.
5. 수정 후 `qa:event-rollout`와 대표 수동 시나리오를 다시 통과시킨다.

## 레거시 제거 목록
- 컬렉션 의존
  - `invitation-page-configs`
  - `invitation-page-registry`
  - `display-periods`
  - `client-passwords`
  - `guestbooks/{pageSlug}/comments`
  - `mobile-client-editor-link-tokens`
  - `mobile-client-editor-audit-logs`
- 코드 정리 후보
  - `src/server/repositories/eventRepository.ts`의 legacy fetch / mirror helper
  - `src/server/repositories/eventSecretRepository.ts`의 legacy secret fallback
  - `src/server/repositories/eventCommentRepository.ts`의 legacy comment fallback
  - `src/server/repositories/eventLinkTokenRepository.ts`의 legacy token fallback
  - `src/server/repositories/eventAuditLogRepository.ts`의 legacy audit fallback
  - `src/server/repositories/readThrough.ts`의 fallback 분기
  - `src/server/repositories/writeThroughCore.ts`의 `legacy-primary` 경로
- 문서 정리 후보
  - `docs/event-write-through-policy.md`
  - `docs/event-repository-rollout.md`
  - `docs/event-backfill-runbook.md`

## 메모
- 이번 단계 코드 변경은 실제 운영 플립을 강제하지 않는다. 운영 환경 변수를 통해 단계적으로 켜는 구조다.
- `event-only` 전환 전에는 backfill과 수동 QA가 끝나 있어야 한다.
