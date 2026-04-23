# birthday 이벤트 타입 PoC

## 1) 우선순위 타입
- `birthday`를 대상 타입으로 고정.
- 이유: `eventType` 메타/renderer/wizard/목록표시 플로우가 이미 함께 준비되어 있어, 기존 wedding 구조의 공통화 범위를 빠르게 점검하기 좋음.

## 2) 최소 구현 점검
- 완료 항목
  - `src/lib/eventTypes.ts`
    - `EVENT_TYPE_KEYS`에 `birthday` 존재
    - `EVENT_TYPE_META.birthday.enabled = true`
    - label/description/admin/customer 라벨이 이벤트 타입별로 설정되어 있음
  - `src/app/_components/eventPageRendererRegistry.tsx`
    - `birthday` renderer 등록 (`createWeddingBackedRenderer('birthday')` 재사용)
  - `src/app/page-wizard/pageWizardData.ts`
    - `birthday-page-wizard` config key 존재
    - `eventType` 기본 값/resolve 흐름에 포함
  - 목록 노출/필터/배지
    - `/admin` 페이지 목록: `src/app/admin/_components/AdminPagesTab.tsx`
    - `AdminPageClient` 검색/필터 파이프: `src/app/admin/AdminPageClient.tsx`
    - 고객 계정 연동 목록: `src/app/admin/_components/AdminCustomerAccountsTab.tsx`
    - 고객 사용자 페이지: `src/app/my-invitations/MyInvitationsClient.tsx`

## 3) 생성 → 저장 → 공개 → 조회 흐름 (코드 기준)
- 생성(웹 위저드)
  - `/page-wizard`에서 `eventType` 스텝의 `birthday` 선택 가능 (`EventTypeStep.tsx`)
  - `createInitialWizardConfig` 및 `setEventType` 경로로 form 상태에 반영
- 저장/공개
  - 저장/최종 저장 시 `prepareWizardConfigForSave`에서 `eventType` 유지/정규화
  - `eventType`은 `events/{slug}`, `eventSlugIndex/{slug}`, `eventSecrets/{id}` 저장 payload 및 read-through 변환에서도 함께 전달
- 조회
  - 공개 라우트(`/{slug}`, `/{slug}/[theme]`)에서 `resolveEventPageRenderer`가 `eventType`을 기준으로 renderer를 선택
  - `eventType -> renderer` 매핑이 존재하지 않더라도 `normalizeEventTypeKey` 및 fallback 규칙으로 안정 동작

## 4) 공통화 vs wedding 전용 요소
- 공통화된 부분
  - 생성/저장/공개/조회 파이프: wizard, repository, route resolver, admin/customer summary 타입 처리
  - 기본 폼 step 구성과 목록/필터 UX 구조
- wedding 전용으로 남은 부분
  - 실제 렌더/디자인은 현재 wedding renderer/테마/컴포넌트를 재사용 (`wedding` 로직 공유)
  - 전용 editor/템플릿, 음악/섹션 문구는 이벤트 타입별 특화되지 않음
- 다음 타입 추가 시 반복 수정 포인트
  - `src/lib/eventTypes.ts`: 메타 enabled/라벨/editor/wizard/renderer 키 등록
  - `src/app/_components/eventPageRendererRegistry.tsx`: 타입별 renderer 존재 시 직접 등록(없으면 fallback 동작)
  - `src/app/page-wizard/pageWizardData.ts`: type 별 step config key 정의
  - 폼/summary 타입 라벨/필터 노출 위치(현재는 관리자/고객 페이지 목록) 점검
