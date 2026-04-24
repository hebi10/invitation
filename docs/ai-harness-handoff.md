### commit message
- fix: app login 페이지의 searchParams 처리로 빌드 오류 수정

### 진행 요약
- `/app/login`이 클라이언트 페이지에서 `useSearchParams()`를 직접 읽어 Next 빌드 시 Suspense 경계 오류가 나던 문제를 수정했습니다.
- `src/app/app/login/page.tsx`를 서버 페이지로 바꾸고, 쿼리 파라미터는 `searchParams` prop으로 받아 정리한 뒤 클라이언트 컴포넌트로 넘기도록 분리했습니다.
- 자동 앱 열기 로직과 화면 렌더링은 `src/app/app/login/AppLoginRedirectClient.tsx`로 옮겨 기존 동작은 유지했습니다.
- `npm run build`까지 다시 실행해 `/app/login` 포함 전체 빌드가 정상 완료되는 것을 확인했습니다.

### 인수인계
- `/app/login` 관련 수정 파일은 `src/app/app/login/page.tsx`, `src/app/app/login/AppLoginRedirectClient.tsx`입니다.
- `next` 쿼리값은 서버 페이지에서 `/manage` fallback과 절대 경로 검증을 거친 뒤 클라이언트로 전달합니다.
- 검증은 `npm run lint:web`, `npm run typecheck:web`, `npm run build` 기준으로 확인했습니다.
- `lint:web`는 기존 `apps/mobile/src/features/manage/hooks/useImageUpload.ts`의 미사용 변수 경고 1건이 그대로 남아 있습니다.

### 남은 작업
- Firebase App Hosting 환경에서 다시 배포할 때도 같은 `/app/login` 경로가 정상 빌드되는지 한 번 더 확인하면 됩니다.
- 기존 홈 화면 단순화 변경분의 모바일 간격과 줄바꿈은 실제 브라우저에서 한 번 보는 편이 좋습니다.
- `page-wizard`/Expo 이미지 3슬롯 저장 재진입 QA와 다른 테마 영향 점검은 아직 남아 있습니다.
