### commit message
- fix: 관리자 인증 로딩 멈춤 방지

### 해결한 문제
- 관리자 인증 확인이 끝나지 않는 경우를 막기 위해 `/api/admin/session` 권한 확인에 10초 timeout을 추가했습니다.
- Firebase Auth 객체를 못 받은 예외 경로에서도 `observeFirebaseSession` 콜백을 호출해 `isAdminLoading`이 true로 고정되지 않게 했습니다.
- 이전 PageEditor/PageWizard 훅 분리와 레포 위생 정리는 유지했습니다.

### 정리한 유지보수 항목
- PageEditorClient는 약 2,520줄로 줄었고, 큰 비동기 흐름은 `pageEditorPersistenceHooks`, `pageEditorImageUploadHook`, `pageEditorVisibilityHook`, `pageEditorPreviewState`로 이동했습니다.
- PageWizardClient는 약 1,915줄 기준이며, `useWizardPreviewState`, `useWizardVisibilityState`, 확장된 `useImageUpload`가 화면 상태 일부를 담당합니다.
- 관리자 인증 상태는 `src/services/adminAuth.ts`에서 Firebase Auth observer와 서버 세션 검증을 함께 관리합니다.

### 검증 명령과 결과
- `npm run check` 통과
- `git diff --check` 통과
- `next dev` 재현은 현재 로컬 Windows 환경의 `spawn EPERM`으로 실행되지 못했습니다.

### 남은 리스크
- App Hosting backend 생성, GitHub live branch 연결, Secret Manager 실제 값 등록은 Firebase 콘솔에서 별도 수행해야 합니다.
- 현재 로컬 환경은 `.git/index.lock` 생성 권한 문제로 `git rm --cached`/stage/commit이 막힐 수 있으며, 이번 로그 제거는 작업트리 삭제 상태로 정리했습니다.
- `next build`/`next dev`의 `spawn EPERM`, 일부 기존 파일의 CRLF 정규화 경고, 큰 클라이언트 파일 잔여 리팩터링은 다음 작업 리스크로 남아 있습니다.
