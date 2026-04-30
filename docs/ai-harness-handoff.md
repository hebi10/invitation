### commit message
- feat: 돌잔치 초대장 운영 흐름 추가

### 해결한 문제
- `first-birthday` 이벤트 타입을 추가하고 `birthday` 라벨은 일반 생일 초대장 전용으로 정리했습니다.
- `first-birthday-pink`, `first-birthday-mint` 전용 공개 렌더러를 추가해 커튼 인트로, 히어로, 인사말, 성장 갤러리, D-Day, 오시는 길, 마음 전하기, 방명록을 표시합니다.
- `/page-wizard?eventType=first-birthday`와 `/admin?section=events&pageCategory=first-birthday`가 돌잔치 타입 기준으로 생성/목록/댓글/이미지/노출 기간 필터를 사용하도록 연결했습니다.

### 최근 변경 유지 항목
- 기존 작업트리에 있던 birthday/general-event 전용 렌더러와 위저드/관리자 변경은 되돌리지 않았습니다.
- 저장 schema는 `InvitationPageSeed`를 유지하고 adapter에서 `displayName`, `couple`, `weddingDateTime`, `venue`, `pageData`를 돌잔치 화면 데이터로 해석합니다.
- wedding 테마 shortcut은 관리자 청첩장 관리용으로 유지하고, 돌잔치 공개 route는 `first-birthday-pink|mint`를 renderer에서 직접 해석합니다.

### 검증 명령과 결과
- `npm run typecheck:web` 통과

### 남은 작업
- `npm run lint:web` 실행과 브라우저 수동 QA가 필요합니다.
- `/page-wizard?eventType=first-birthday`, 공개 페이지 기본/pink/mint route, 방명록 작성/조회, 계좌 복사 UI를 확인해야 합니다.
- `/admin?section=events&pageCategory=first-birthday`의 실제 데이터 목록/댓글/이미지/노출 기간 필터를 운영 데이터로 확인해야 합니다.
