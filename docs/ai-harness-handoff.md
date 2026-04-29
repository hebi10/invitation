### commit message
- fix: 고객 생성 후 page-wizard 진입 복구

### 해결한 문제
- `/my-invitations/create`에서 고객이 제작권으로 청첩장을 만들면 목록/지갑 쿼리 무효화를 기다리지 않고 바로 `/page-wizard/{slug}`로 이동하도록 정리했습니다.
- `PageWizardClient`의 기존 청첩장 접근 게이트가 `isAdminLoggedIn`만 보고 있어 고객 소유 slug도 막히던 문제를 수정했습니다.
- 고객이 방금 만든 청첩장은 소유권 연결이 되어 있으면 `/page-wizard/{slug}`에서 바로 편집 화면을 열 수 있습니다.

### 최근 변경 유지 항목
- 고객 신규 생성과 모바일 생성 API는 이메일 인증 또는 신뢰 provider 확인을 거칩니다.
- 고객 편집 권한은 Firebase ID token과 `events.ownerUid` 일치 여부로 확인합니다.
- 이메일 인증 상태 확인/재발송 흐름과 관리자 요약 카드 레이아웃 보정은 기존 수정 상태를 그대로 유지합니다.

### 검증 명령과 결과
- `npm run typecheck:web` 통과
- `npm run lint:web` 통과
- `git diff --check` 통과

### 남은 리스크
- Firebase 인증 메일은 실제 수신함/스팸함과 Firebase Authorized domains 설정까지 실계정으로 확인이 필요합니다.
- Google Play 계정 삭제 요구사항 기준으로 모바일 앱 내부에도 삭제 요청 경로가 잘 보이는지 실기기에서 확인이 필요합니다.
- 모바일 앱 연동 링크와 RevenueCat 결제 완료 흐름은 실기기에서 최종 QA가 필요합니다.
