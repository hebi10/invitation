### Commit 메시지
- `docs: unify firestore documentation around event source of truth`

### 이번 작업 요약
- 기준 문서 통일
  - `README.md`, `docs/event-data-architecture.md`, `docs/event-data-mapping.md`, `docs/event-cutover-checklist.md`를 현재 완료 상태 기준으로 다시 정리했다.
  - source of truth는 `events/{eventId}`, slug 해석은 `eventSlugIndex/{slug}`, 비밀번호는 `eventSecrets/{eventId}`, 결제는 `billingFulfillments/{transactionId}`로 문서 기준을 통일했다.
- 완료 상태 반영
  - `memory-pages`는 별도 도메인으로 유지한다고 명시했다.
  - 이벤트 도메인 legacy 컬렉션 제거 완료 상태를 문서에 반영했다.
  - 컷오버 문서는 “진행 예정”이 아니라 “완료 후 운영 기준” 문서로 바꿨다.

### 검증
- 문서 작업만 수행
- `docs/ai-harness-handoff.md` 22줄 유지

### 다음 작업
1. 실화면 수동 확인
   - 관리자/공개/모바일 주요 흐름을 실제 화면에서 최종 점검
2. rules 배포 확인
   - `firestore.rules` 변경이 Firebase에 반영됐는지 확인
3. 잔여 migration 문서 정리
   - `mobile-client-editor-link-tokens`, `mobile-client-editor-audit-logs` 관련 이관 기록을 계속 보존할지 결정
