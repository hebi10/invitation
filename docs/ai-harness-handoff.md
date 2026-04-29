### commit message
- chore: 운영 리뷰 리스크 정리

### 해결한 문제
- 루트 layout의 전역 `AdminProvider`/`AppQueryProvider`를 제거하고, 관리자·고객·편집 라우트에만 실제 Auth/Query Provider를 배치했습니다.
- 공개 청첩장과 추억 페이지는 `AnonymousAdminProvider`를 사용해 Firebase Auth 관찰 없이 공개 상태로 렌더링합니다.
- `webpackBuildWorker: false`는 Windows 로컬/명시 환경에서만 적용되도록 조건부화했습니다.

### 정리한 유지보수 항목
- `@typescript-eslint/no-explicit-any`를 `error`로 되돌리고, src/apps/scripts 기준 명시적 `any` 사용을 0건으로 줄였습니다.
- Kakao SDK 전역 타입과 Firebase Storage/List 타입을 명시해 지도·공유·음악·추억 페이지 경로의 타입 방어선을 강화했습니다.
- `.env.example`과 README에 `NEXT_DISABLE_WEBPACK_BUILD_WORKER` 로컬 옵션을 추가했습니다.

### 검증 명령과 결과
- `npm run check` 통과
- `npm run typecheck:web` 통과

### 남은 리스크
- 로컬 `.env.local`의 Admin SDK 자격증명은 실제 서비스 계정 파일 또는 Secret 값이 필요해 코드에서 대체할 수 없습니다.
- App Hosting backend 생성, GitHub live branch 연결, Secret Manager 실제 값 등록은 Firebase 콘솔에서 별도 수행해야 합니다.
- `next dev`/`next build`의 `spawn EPERM` 환경 문제와 큰 클라이언트 파일 잔여 리팩터링은 다음 작업 리스크입니다.
