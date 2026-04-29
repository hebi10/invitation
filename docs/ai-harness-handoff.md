### commit message
- fix: 이메일 인증 상태 확인 흐름 정리

### 해결한 문제
- `/signup` 회원가입 직후 미인증 고객은 `/my-invitations`로 즉시 이동하지 않고 인증 안내를 볼 수 있게 했습니다.
- `/my-invitations`와 `/my-invitations/create` 직접 접근도 미인증 회원가입 계정이면 이메일 인증 필요 화면을 보여주도록 막았습니다.
- Firebase 인증 메일 발송 전에 Auth 언어를 `ko`로 고정하고, `인증 상태 확인`과 `인증 메일 다시 보내기` 버튼 역할을 분리했습니다.

### 최근 변경 유지 항목
- 고객 신규 생성과 모바일 생성 API는 이메일 인증 또는 신뢰 provider 확인을 거칩니다.
- 고객 편집 권한은 Firebase ID token과 `events.ownerUid` 일치 여부로 확인합니다.
- 탭 복귀/화면 재노출 시 Auth 세션을 자동 refresh해서 이메일 인증 완료 상태를 다시 읽습니다.

### 검증 명령과 결과
- `npm run typecheck:web` 통과
- `npm run lint:web` 통과
- `git diff --check` 통과

### 남은 리스크
- Firebase 인증 메일은 실제 수신함/스팸함과 Firebase Authorized domains 설정까지 실계정으로 확인이 필요합니다.
- Google Play 계정 삭제 요구사항 기준으로 모바일 앱 내부에도 삭제 요청 경로가 잘 보이는지 실기기에서 확인이 필요합니다.
- 모바일 앱 연동 링크와 RevenueCat 결제 완료 흐름은 실기기에서 최종 QA가 필요합니다.
