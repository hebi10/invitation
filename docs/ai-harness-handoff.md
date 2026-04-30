### commit message
- fix: 방명록 권한과 rate limit 보안 강화

### 해결한 문제
- Firestore rules에서 고객 소유자가 본인 이벤트의 방명록 댓글을 직접 관리할 수 있는 권한을 유지하도록 조정했습니다.
- 고객 댓글 삭제 API 인증 검증을 공통 helper로 분리해 토큰 없음/만료/위조는 401, 소유권 없음은 403으로 분리했습니다.
- 운영 환경의 민감 rate limit scope는 Firestore 저장소 실패 또는 미가용 시 로컬 fallback 대신 fail-closed로 차단합니다.

### 최근 변경 유지 항목
- 고객 신규 생성과 모바일 생성 API는 이메일 인증 또는 신뢰 provider 확인을 거칩니다.
- 고객 편집 권한은 Firebase ID token과 `events.ownerUid` 일치 여부로 확인합니다.
- 공개 방명록 작성은 계속 서버 API만 사용하며, Firestore client 직접 create는 차단 상태를 유지합니다.

### 검증 명령과 결과
- `npm run test:customer-api-auth` 통과
- `npm run test:rate-limit-policy` 통과
- `npm run qa:event-rollout` 통과
- `npm run lint:web` 통과
- `git diff --check` 통과

### 남은 리스크
- `npm run test:rules`는 추가했지만 현재 로컬 환경에서 Java 실행이 불가해 Firestore emulator가 시작되지 않습니다.
- `npm run build`의 Next 내부 type-checking `spawn EPERM`은 CI 또는 Firebase App Hosting에서 재확인이 필요합니다.
- PageEditorClient/PageWizardClient 대형 파일 분리는 별도 리팩터링 작업으로 남아 있습니다.
