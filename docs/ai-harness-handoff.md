### Commit 메시지
- `Prepare event cutover modes and rollout checklist`

### 작업 요약
- 12단계 컷오버 준비를 반영했다. `src/server/repositories/eventRolloutConfig.ts`를 추가해서 `EVENT_ROLLOUT_WRITE_MODE`, `EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK`, `EVENT_ROLLOUT_LEGACY_READ_FALLBACK_UNTIL`로 읽기 fallback과 쓰기 모드를 제어할 수 있게 했다.
- `readThrough.ts`, `writeThroughCore.ts`, `eventRepository.ts`, `eventSecretRepository.ts`, `eventCommentRepository.ts`, `eventLinkTokenRepository.ts`, `eventAuditLogRepository.ts`를 컷오버 모드 대응으로 정리했다. 기본값은 여전히 안전한 `legacy-primary`이고, 운영에서만 `event-only`로 올릴 수 있다.
- 컷오버 문서 `docs/event-cutover-checklist.md`를 추가했다. 체크리스트, 롤백 계획, 레거시 제거 목록을 한 문서에 정리했다.

### 확인 사항
- 실행 완료: `npm run qa:event-rollout`
- 실행 결과:
  - `test:api-repository-boundary` 통과
  - `test:readthrough-repositories` 통과
  - `test:write-through-repositories` 통과
  - `test:slug-index` 통과
  - `test:event-backfill` 통과
  - `typecheck:web` 통과
  - `lint:web` 통과
  - `typecheck:mobile` 통과
  - `lint:mobile` 통과
- 실행 실패: `npm run test:smoke`
  - 원인: `next build` 단계 `spawn EPERM`
  - 코드 오류보다는 현재 셸/환경의 프로세스 spawn 제약 가능성이 높다.

### 남은 작업
1. 실운영 컷오버
   - backfill validate, `event-write-through-failures` 정리, 대표 수동 QA 후 운영 env를 `event-only`로 전환해야 한다.
2. fallback 종료
   - `EVENT_ROLLOUT_LEGACY_READ_FALLBACK_UNTIL` 운영 기간을 지난 뒤 `EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK=false`로 내려야 한다.
3. 레거시 제거
   - 안정화 후 legacy 컬렉션 write/read 코드와 문서를 제거해야 한다. 상세 목록은 `docs/event-cutover-checklist.md` 참고.

### 메모
- 이번 단계는 실제 운영 기본값을 강제로 바꾸지 않았다. 로컬/개발 기본값은 계속 `legacy-primary`다.
- `event-only` 모드가 가능한 수준까지 저장소 코드를 정리했지만, 실제 승격은 운영 데이터 확인 이후에만 진행해야 한다.
