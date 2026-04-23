# 웹 page-wizard 정렬 상태

## 현재 기준

- `/page-wizard`
  - `/page-wizard/[slug]`와 같은 `PageWizardClient` wizard 레이아웃으로 진입한다.
- `/page-editor`
  - `InvitationDraftSetupClient`를 통한 초안 생성 화면을 유지한다.

## 현재 동작

1. `/page-wizard`
   - 관리자 권한 확인 후 바로 wizard 편집 화면으로 진입한다.
   - 새 생성에서는 `이벤트 타입 -> 디자인/상품 -> 주소 -> 본문` 순서로 진행한다.
   - 이벤트 타입은 현재 `wedding`만 실제 선택 가능하고, 다른 타입은 `준비 중`으로 보인다.
   - 주소 단계에서 `예비 신랑/신부 영문 이름 + 페이지 주소 + 고객 비밀번호`를 함께 입력한다.
   - 영문 이름을 입력하면 페이지 주소가 자동으로 채워지고, 필요하면 주소를 직접 수정할 수 있다.
2. `/page-wizard/{slug}`
   - 기존 초안 또는 저장된 페이지를 같은 wizard 편집 화면으로 연다.
   - 기존 수정에서는 저장된 `eventType`을 고정하고 다시 선택하지 않는다.
   - 고객 비밀번호 로그인 후 관리 가능한 흐름을 유지한다.
3. `/page-editor`
   - 초안 생성 화면에서 시작한 뒤 `/page-editor/{slug}`로 이동한다.

## 메모

- `PageWizardClient`는 이제 `eventType -> wizard step config` 구조를 먼저 가진다.
- 현재 실제 step 배열은 `wedding` 기준을 재사용하고, 다른 타입 전용 step 분리는 다음 단계로 남아 있다.
- 현재 사용자 기준 주소 단계 UX는 `영문 이름으로 URL 생성 + 직접 수정 가능` 방향으로 유지한다.
- 다음 정리 단계에서는 slug 검증 타입과 UI 상태를 더 단순하게 정리할 수 있다.
