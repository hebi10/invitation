# page-wizard 정렬 상태

## 현재 기준

- `/page-wizard`, `/page-wizard/[slug]`, `/page-wizard/[slug]/result`, `/page-editor/[slug]`는 React Query 기반으로 기존 초안/결과를 읽습니다.
- 결과/편집 화면의 기본 조회 정책은 `staleTime 15분`, `gcTime 30분`, `refetchOnWindowFocus: false`입니다.
- `/page-wizard/[slug]`의 소유권/편집 진입 확인은 이전 `claim` 캐시를 믿지 않고 `staleTime: 0`, `refetchOnMount: "always"`로 매번 다시 확인합니다.
- 캐시가 살아 있는 동안 재조회가 필요 없는 화면은 이전 응답을 우선 사용하고, 사용자가 눌렀을 때 수동 새로고침을 실행합니다.

## 현재 동작

1. `/page-wizard`
   - 신규 생성과 기존 페이지 편집 진입을 모두 `PageWizardClient`가 담당합니다.
   - 기존 slug 편집은 비관리자 고객의 경우 `/api/customer/events/[slug]/editable` 서버 API로 소유권과 기존 설정을 함께 확인하고, 접근 제한/연결 필요 상태도 쿼리 결과로 분기합니다.
   - 현재 UID에 이미 연결된 청첩장은 비밀번호 claim 카드 없이 바로 편집 화면으로 진입합니다.
   - claim 카드 렌더링 전 `/api/customer/events` 소유 목록 확인을 별도로 기다리며, 목록에 현재 slug가 있으면 편집 state를 즉시 적용합니다.
   - 이전에 claim 필요로 캐시된 상태여도 페이지 진입 시 다시 확인하며, 재확인 중에는 claim 카드 대신 로딩 상태를 보여줍니다.
   - editable API가 일시적으로 claimable을 반환해도, 같은 UID의 `/api/customer/events` 목록에 해당 slug가 있으면 claim 카드 대신 소유 이벤트 fallback config로 진입합니다.
   - editable API가 claimable을 반환했더라도 소유 이벤트 목록 재확인이 끝나기 전에는 claim 카드를 렌더링하지 않아 비밀번호 입력창 깜박임을 막습니다.
   - 기존 청첩장 연결 비밀번호 검증에 성공하면 claim API 응답에 포함된 편집 config를 우선 적용해 바로 편집 화면으로 전환합니다.
   - 비관리자 고객 흐름에서는 진입 직후 Storage folder listing과 클라이언트 Firestore 정리 저장을 실행하지 않습니다.
   - 성공 후 편집 데이터 재조회가 실패하거나 10초 안에 끝나지 않으면 로딩 화면에 머무르지 않고 claim 카드로 돌아와 “비밀번호는 맞음” 상태를 안내합니다.
   - `저장 후 바로 공개하기` 옵션은 서버에서 내려온 `published` 상태를 그대로 반영합니다.
   - 상단, claim 카드, 접근 제한 카드에 `다시 불러오기` 버튼이 있어 저장 직후나 권한 변경 직후 수동으로 최신값을 확인할 수 있습니다.
   - Kakao 지도 SDK 실패와 권한 제한 이미지 목록 조회는 화면 fallback으로 처리하며 개발 오버레이를 띄우는 `console.error`를 사용하지 않습니다.
2. `/page-wizard/[slug]/result`
   - 결과 화면도 동일한 15분 캐시 정책을 사용합니다.
   - 결과 카드와 오류 카드에서 수동 새로고침을 제공합니다.
3. `/page-editor/[slug]`
   - 비관리자 고객의 소유권 확인은 `/api/customer/events/[slug]/ownership`, 편집 설정 조회는 `/api/customer/events/[slug]/editable` 서버 API를 우선 사용합니다.
   - `다시 불러오기` 버튼으로 현재 Firestore 설정을 다시 읽을 수 있습니다.
   - 저장/복구/공개 상태 변경 뒤에는 공개 페이지, 내 이벤트, 소유권 캐시를 함께 invalidate합니다.

## 메모

- slug step의 한글 이름 입력은 초안 생성 시 본문 기본값과 메타에 바로 반영됩니다.
- slug step의 영문 이름 입력은 주소 입력과 자동 동기화되며, 주소를 직접 수정한 뒤에는 수동 입력을 우선합니다.
- `/my-invitations`의 `수정하기`, `미리보기` 링크는 새 탭으로 열립니다.
