### commit message
- style: 고객 탈퇴 버튼 위치 축소

### 해결한 문제
- 관리자 고객 계정 카드의 큰 `계정 탈퇴 처리` 섹션을 제거했습니다.
- 탈퇴 처리는 계정 카드 헤더의 작은 버튼으로 옮겼고, 고객 계정에만 노출합니다.
- 기존 탈퇴 처리 동작은 소유권 해제, 즉시 비공개, 지갑 삭제, Firebase Auth 삭제 순서를 유지합니다.

### 최근 변경 유지 항목
- 고객 신규 생성과 모바일 생성 API는 이메일 인증 또는 신뢰 provider 확인을 거칩니다.
- 고객 편집 권한은 Firebase ID token과 `events.ownerUid` 일치 여부로 확인합니다.
- 레거시 비밀번호 데이터는 신규 코드 경로에서 생성, 검증, 저장하지 않습니다.

### 검증 명령과 결과
- `npm run typecheck:web` 통과
- `npm run lint:web` 통과
- `git diff --check` 통과, 기존 CRLF/LF 변환 경고 1건 표시

### 남은 리스크
- Google Play 계정 삭제 요구사항 기준으로 모바일 앱 내부에도 삭제 요청 경로가 잘 보이는지 실기기에서 확인이 필요합니다.
- 실제 Firebase 데이터의 오래된 `eventSecrets`/`client-passwords` 문서는 별도 운영 스크립트로 정리할지 결정이 필요합니다.
- 모바일 앱 연동 링크와 RevenueCat 결제 완료 흐름은 실기기에서 최종 QA가 필요합니다.
