### commit message
- refactor: 운영 경계와 관리자 전용 편집 정책 정리

### 해결한 문제
- 홈 화면 링크를 3개로 줄였습니다. 남은 링크는 관리자 대시보드, 판매 페이지, 대시보드입니다.
- `/page-wizard`, `/page-wizard/[slug]`, `/page-editor`, `/page-editor/[slug]`는 웹에서 관리자 전용 안내를 표시하도록 정리했습니다.
- 웹 고객 편집용 `/api/client-editor/*` API는 관리자 전용 전환 안내를 반환하도록 막고, 모바일 `/api/mobile/client-editor/*` 흐름은 유지했습니다.

### 정리한 유지보수 항목
- README, 포트폴리오 개요, 보안 체크리스트, page-wizard 정렬 문서를 관리자 전용 웹 편집 정책에 맞게 갱신했습니다.
- 이전 사이클의 repository 경계, Firestore rate limit, RevenueCat 서버 키, EOL, hosting, 대형 파일 분리, 이벤트 문서 통합 정리는 유지했습니다.
- 커밋 시도는 `.git/index.lock` 생성 권한 오류로 실패한 상태가 이어지고 있습니다.

### 검증 명령과 결과
- `npm run check` 통과
- `npm run qa:event-rollout` 통과
- `npm run build` 통과
- `git diff --check` 통과

### 남은 리스크
- `.git/index.lock` 생성 권한 문제로 아직 커밋하지 못했습니다.
- 모바일 고객 편집 정책은 유지했으므로, 웹 관리자 전용 정책과 모바일 고객 정책을 운영 문구에서 혼동하지 않도록 계속 분리해야 합니다.
- 동적 Next 라우트가 주 경로이므로 실제 웹 배포는 Firebase App Hosting, Cloud Run, Vercel 등 SSR 런타임 중 하나로 확정해야 합니다.
