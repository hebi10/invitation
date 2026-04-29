### commit message
- fix: 고객 소유 청첩장 편집 흐름 복구

### 해결한 문제
- `/page-wizard/[slug]`가 관리자 게이트에 막혀 고객 소유 청첩장 편집으로 진입하지 못하던 흐름을 수정했습니다.
- 기존 slug가 있는 고객 편집 저장은 새 초안 생성을 요구하지 않고 현재 소유 페이지에 저장되도록 `ensureDraftCreated` 순서를 바로잡았습니다.
- 고객 위저드 이미지 업로드는 Firebase Auth 소유권을 Storage rules가 검증하는 직접 업로드 경로를 사용하도록 맞췄습니다.

### 정리한 유지보수 항목
- 고객 청첩장 생성 중 비밀번호 저장/소유권 연결 단계에서 실패하면 부분 생성된 초안을 삭제하고 제작권 환불을 시도합니다.
- `docs/web-page-wizard-alignment.md`, `docs/service-repository-boundary.md`, `docs/customer-wallet-commerce-plan.md`에 현재 고객 소유권 편집 기준을 반영했습니다.
- 관리자 신규 생성은 계속 `/page-wizard` 관리자 전용이고, 고객 직접 생성은 `/my-invitations/create`에서 제작권을 사용합니다.
- git 추적 대상이던 루트 `firebase-service-account.json`을 제거하고 `.gitignore`에 명시했습니다.

### 검증 명령과 결과
- `npm run check` 통과
- `npm run typecheck:web` 통과
- `npm run lint:web` 통과
- `npm run test:service-repository-boundary` 통과
- `npm run test:event-write-paths` 통과
- `git diff --check` 통과

### 남은 리스크
- 모바일 RevenueCat `appUserId`와 Firebase UID 연결이 없어서 모바일 미사용 제작권을 PC에서 쓰는 완전 공용화는 후속 작업입니다.
- 이벤트별 티켓 사용 내역과 고객 지갑 원장은 구매/배정 중심으로만 연결되어 있어 세부 사용 마이그레이션은 후속 작업입니다.
- 로컬 개발에서 Admin SDK가 필요하면 `FIREBASE_SERVICE_ACCOUNT_JSON` 또는 저장소 밖 `GOOGLE_APPLICATION_CREDENTIALS`로 다시 연결해야 합니다.
