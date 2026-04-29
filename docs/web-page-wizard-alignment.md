# page-wizard 정렬 상태

## 현재 기준
- `/page-wizard` 신규 생성은 웹에서 관리자 전용 화면이다.
- `/page-wizard/[slug]`는 관리자는 모든 청첩장을, 고객은 Firebase 계정의 `ownerUid`와 연결된 청첩장만 편집할 수 있다.
- 비로그인 사용자는 로그인 안내를 보고, 미연결 기존 청첩장은 로그인 후 기존 페이지 비밀번호로 현재 계정에 연결할 수 있다.
- 웹 고객 편집용 `/api/client-editor/*` 비밀번호 세션 API는 관리자 전용 전환 안내를 반환하고, 모바일 앱용 `/api/mobile/client-editor/*` 흐름은 별도로 유지한다.

## 현재 동작
1. `/page-wizard`
   - 관리자 권한이 확인된 계정만 새 청첩장 초안을 만들 수 있다.
   - 신규 생성과 기존 slug 편집은 `PageWizardClient`가 담당하되, 기존 slug는 고객 소유권 API도 사용한다.
   - 공개 URL에서 관리자가 비공개 또는 기간 제한 페이지를 확인할 때는 `/api/admin/events/[slug]` 서버 API를 통해 private 포함 설정을 다시 읽는다.
2. `/page-wizard/[slug]/result`
   - 결과 화면은 저장 직후 공개 URL과 입력 요약을 확인하는 관리자용 화면이다.
   - 고객 직접 생성 뒤 상세 편집은 `/page-wizard/[slug]`에서 이어서 처리한다.
3. `/page-editor`와 `/page-editor/[slug]`
   - 웹 고객 편집기는 관리자 전용으로 제한한다.
   - 비관리자 사용자는 관리자 전용 안내 문구만 확인한다.
   - 저장, 복구, 공개 상태 변경 뒤에는 공개 페이지와 관리자 캐시를 함께 invalidate한다.

## 메모
- slug step의 신랑/신부 영문 이름 입력은 초안 생성 후 본문 기본값과 메타에 바로 반영한다.
- slug step의 영문 이름 입력은 주소 입력과 자동 동기화되며, 주소를 직접 수정한 뒤에는 수동 입력을 우선한다.
- `/my-invitations`는 고객 계정에 연결된 청첩장을 확인하는 대시보드로 유지한다.
