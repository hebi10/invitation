# 이벤트 타입 레지스트리

## 목적
- 이벤트 타입 key와 표시용 메타를 한 곳에서 관리한다.
- `wedding` 기본값 판단을 개별 저장소/매퍼 하드코딩이 아니라 공통 레지스트리 기준으로 통일한다.
- 이후 `birthday`, `seventieth`, `etc`를 붙일 때 수정 범위를 예측 가능하게 만든다.

## 기준 파일
- `src/lib/eventTypes.ts`

## 현재 레지스트리 항목
| key | label | admin label | customer label | enabled | default renderer | default editor | default wizard |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `wedding` | 모바일 청첩장 | 청첩장 | 내 청첩장 | `true` | `wedding-default` | `wedding-page-editor` | `wedding-page-wizard` |
| `birthday` | 생일/돌잔치 | 생일/돌잔치 | 내 생일/돌잔치 페이지 | `true` | `birthday-default` | `birthday-page-editor` | `birthday-page-wizard` |
| `general-event` | 일반 행사 초대장 | 일반 행사 | 내 행사 초대장 | `true` | `general-event-default` | `general-event-page-editor` | `general-event-page-wizard` |
| `seventieth` | 칠순 잔치 | 칠순 잔치 | 내 칠순 잔치 페이지 | `false` | `seventieth-default` | `seventieth-page-editor` | `seventieth-page-wizard` |
| `etc` | 기타 이벤트 | 기타 이벤트 | 내 이벤트 페이지 | `false` | `generic-default` | `generic-page-editor` | `generic-page-wizard` |

## 이번 단계에서 바꾼 기준
- 기본 event type 상수: `DEFAULT_EVENT_TYPE`
- event type 정규화 함수: `normalizeEventTypeKey`
- 메타 조회 함수: `getEventTypeMeta`
- 공통 화면 label 함수: `getEventTypeDisplayLabel`
- 활성 타입 목록 함수: `listEnabledEventTypes`

## 지금 바로 레지스트리를 쓰는 위치
- 서버 event summary / slug index 기본값
  - `src/server/repositories/eventRepository.ts`
  - `src/server/repositories/eventReadThroughDtos.ts`
- 클라이언트 event summary / slug index 기본값
  - `src/services/repositories/clientEventRepositoryCore.ts`
  - `src/services/repositories/mappers/clientEventRepositoryMapper.ts`
- 공개 페이지 route의 renderer 선택 기준
  - `src/app/_components/eventPageRendererRegistry.tsx`
  - `src/app/[slug]/page.tsx`
  - `src/app/[slug]/[theme]/page.tsx`
  - `src/app/[slug]/layout.tsx`
- web wizard의 step config 기준
  - `src/app/page-wizard/pageWizardData.ts`
  - `src/app/page-wizard/PageWizardClient.tsx`
  - `src/app/page-wizard/hooks/useWizardPersistence.ts`
- 관리자/고객 목록의 type badge 및 filter 기준
  - `src/app/admin/AdminPageClient.tsx`
  - `src/app/admin/_components/AdminPagesTab.tsx`
  - `src/app/admin/_components/AdminCustomerAccountsTab.tsx`
  - `src/app/my-invitations/MyInvitationsClient.tsx`

## 이번 단계 후 상태
- 공개 페이지는 이제 `eventType -> renderer` 레지스트리를 통해 렌더러를 고른다.
- 현재 실제로 등록된 renderer는 `wedding`, `birthday` 두 개다.
- `birthday`는 PoC용으로 활성화되어 선택/저장/목록 표시까지 열려 있다.
- `birthday`의 renderer는 현재 wedding 공개 페이지 구현을 재사용한다.
- `seventieth`, `etc`는 메타만 준비된 상태이고, renderer가 없거나 비활성 상태면 `wedding` renderer로 fallback한다.
- 잘못된 event type 문자열은 `normalizeEventTypeKey`로 정규화한 뒤 기본값 `wedding`으로 처리한다.
- web wizard도 이제 `eventType -> step config` 구조를 먼저 가진다.
- 현재 실제 생성 가능한 타입은 `wedding`, `birthday`이고, 나머지는 `준비 중`으로만 노출된다.
- 다만 `birthday`의 실제 본문 구조와 일부 step 문구는 아직 wedding 구현을 재사용한다.

## `wedding` 하드코딩 분류
### 1. 지금 기본값으로 필요한 곳
- 이벤트 저장소의 기본 event type fallback
- event summary / slug index 정규화
- 새 이벤트 생성 시 event type 기본값

### 2. 아직 wedding 도메인이라 그대로 두는 곳
- 공개 페이지 내부 renderer/state 구현
  - `src/app/_components/eventPageState.tsx`
  - `src/app/_components/eventPageThemes.ts`
  - `src/app/_components/EventInvitationPage.tsx`
  - 내부 구현은 아직 wedding theme renderer를 사용
- page-wizard / page-editor의 본문 구조
  - 일정, 예식장, 방명록, 이미지 필드 구조가 wedding 중심
- config/seed 기반 legacy fallback
  - `src/config/weddingPages.ts`
  - `getWeddingPageBySlug`, `getAllWeddingPageSeeds`

### 3. 이후 분리해야 할 곳
- 이벤트별 editor registry
- `birthday`, `seventieth`, `etc`용 실제 wizard step config
- `birthday`, `seventieth`, `etc`용 실제 renderer 구현
- 타입별 생성 진입점과 이벤트 전용 정렬 규칙

## 판단 기준
- 이번 단계는 `wedding` 렌더러를 없애는 작업이 아니다.
- 이번 단계는 "기본 event type을 한 곳에서 판단"하게 만드는 준비 작업이다.
- 다른 이벤트 타입을 실제로 붙이려면 renderer/editor/wizard 분리가 다음 단계로 필요하다.
