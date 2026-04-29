### commit message
- feat: 내 이벤트 방명록 팝업 전환

### 해결한 문제
- `/my-invitations` 이벤트 카드의 방명록 확인을 인라인 확장 대신 팝업 모달로 열도록 변경했습니다.
- 방명록 팝업은 배경 클릭, 닫기 버튼, ESC 키로 닫히며 열려 있는 동안 본문 스크롤을 잠급니다.
- 팝업 안에서 기존처럼 방명록 새로고침과 삭제 예정 처리를 유지합니다.

### 최근 변경 유지 항목
- 공개 청첩장 방명록 제목 클릭으로 관리 모드를 여는 기능은 제거된 상태입니다.
- 고객 편집 권한은 Firebase ID token과 `events.ownerUid` 일치 여부로 확인합니다.
- 레거시 비밀번호 데이터는 신규 코드 경로에서 생성, 검증, 저장하지 않습니다.

### 검증 명령과 결과
- `npm run typecheck:web` 통과
- `npm run lint:web` 통과
- `git diff --check` 통과, 일부 기존 파일 CRLF/LF 경고만 표시

### 남은 리스크
- 실제 Firebase 데이터의 오래된 `eventSecrets`/`client-passwords` 문서는 별도 운영 스크립트로 정리할지 결정이 필요합니다.
- 모바일 앱 연동 링크와 RevenueCat 결제 완료 흐름은 실기기에서 최종 QA가 필요합니다.
