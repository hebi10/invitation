### commit message
- fix: page-wizard 소유 확인 깜박임과 지도 오류 오버레이 완화

### 해결한 문제
- `/page-wizard/[slug]`에서 editable API가 `claim`을 먼저 반환해도 `/api/customer/events` 소유 목록 확인이 끝나기 전에는 비밀번호 claim 카드를 보여주지 않도록 조정했습니다.
- 소유 목록에 현재 slug가 있으면 claim/error 상태에서도 sample 기반 편집 config를 적용해 바로 편집 화면으로 진입합니다.
- page-wizard의 `저장 후 바로 공개하기` 옵션은 서버 `published` 상태를 그대로 반영합니다.
- Kakao Maps SDK 로딩 실패, Storage 이미지 listing 권한 거부, editable config 권한 거부는 화면 fallback/warn 처리로 바꿔 Next 개발 오버레이가 뜨지 않게 했습니다.
- `/my-invitations/`의 `수정하기`, `미리보기`는 새 탭으로 열립니다.

### 수정한 주요 파일
- `src/app/page-wizard/PageWizardClient.tsx`
- `src/app/page-wizard/steps/VenueLocationPreview.tsx`
- `src/components/sections/LocationMap/LocationMap.tsx`
- `src/components/sections/LocationMap/LocationMapSimple.tsx`
- `src/services/invitationPageService.ts`
- `src/services/imageService.ts`
- `src/server/customerEventsService.ts`
- `src/services/customerEventService.ts`
- `src/app/my-invitations/MyInvitationsClient.tsx`
- `docs/web-page-wizard-alignment.md`
- `docs/service-repository-boundary.md`

### 검증 명령어 결과
- `npm run typecheck:web` 통과
- `npm run lint:web` 통과
- `npm run test:service-repository-boundary` 통과

### 남은 리스크
- 실제 Firebase 로그인 브라우저 세션에서 `/page-wizard/kim-shinlang-na-sinbu/`가 비밀번호 없이 바로 편집 화면으로 들어가는지 QA가 필요합니다.
- sample fallback으로 편집 진입한 이벤트는 저장 시 운영 custom config와 충돌하지 않는지 확인이 필요합니다.
- Kakao SDK 키/도메인 설정 자체가 틀린 경우 지도는 fallback 안내로 남고, 외부 지도 버튼으로 확인해야 합니다.

### 다음 작업 후보
- 브라우저에서 연결 계정으로 page-wizard 진입, 저장, 새 탭 미리보기까지 통합 QA
- 고객용 저장/공개 상태 변경 경로를 서버 API 중심으로 단계적 전환
- 운영 데이터의 slug index와 owner summary 불일치 정리 스크립트 검토
