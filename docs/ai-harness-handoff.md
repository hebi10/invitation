### commit message
- refactor: 운영 경계와 대형 파일 유지보수성 개선

### 해결한 문제
- `PageEditorClient.tsx`에서 접근 쿼리 훅, 필드 메타 렌더러, 기본 정보 섹션, 일정 섹션을 분리했습니다. 현재 줄 수는 2799줄입니다.
- `invitationPageService.ts`의 초안 생성/seed template 헬퍼를 `invitationPageSeedDrafts.ts`로 분리했습니다. 현재 줄 수는 861줄입니다.
- 이벤트 도메인 문서는 현재 기준을 `event-domain-current-state.md`, 운영 점검을 `event-rollout-monitoring.md`로 통합하고 구형 rollout/write-through 세부 문서를 제거했습니다.

### 정리한 유지보수 항목
- `portfolio-service-overview.md`는 화면별 반복 목차를 표 중심으로 압축해 72줄로 정리했습니다.
- 문서 수는 `docs` 기준 30개에서 22개로 줄였고, README와 Docs Hub의 삭제 문서 참조를 제거했습니다.
- 이전 사이클의 Firestore rules, rate limit, hosting, EOL, type boundary 정리는 유지했습니다.

### 검증 명령과 결과
- `npm run check` 통과
- `npm run qa:event-rollout` 통과
- `npm run build` 통과
- `git diff --check` 통과
- 커밋 시도는 `.git/index.lock` 생성 권한 오류로 실패했습니다. `git add`가 `Permission denied`를 반환했고, lock 파일과 실행 중인 git 프로세스는 없었습니다.

### 남은 리스크
- `PageEditorClient.tsx`, `PageWizardClient.tsx`, `romantic.tsx`는 여전히 큰 편이라 다음 변경 때 Venue/Greeting/Gallery/Music/Gift 단위 분리를 계속하는 편이 안전합니다.
- Firestore `rateLimits` 컬렉션은 코드가 `expiresAt`을 기록하지만 실제 TTL 정책은 Firebase 콘솔 또는 CLI에서 별도 활성화가 필요합니다.
- 동적 Next 라우트가 주 경로이므로 실제 웹 배포는 Firebase App Hosting, Cloud Run, Vercel 등 SSR 런타임 중 하나로 확정해야 합니다.
