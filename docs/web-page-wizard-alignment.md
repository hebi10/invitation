# 웹 생성 흐름 정리

## 이번 단계 반영

- `/page-wizard` 신규 생성 진입은 이제 `InvitationDraftSetupClient`를 공통으로 사용한다.
- 웹 생성 시작점은 `템플릿 선택 + 신랑 이름 + 신부 이름 + 청첩장 주소 1필드`로 통일한다.
- 청첩장 주소 자동 제안 규칙은 `src/lib/invitationPageSlug.ts`의 공통 helper를 사용한다.
- `page-wizard` 신규 생성에서 영문 이름 2필드를 요구하던 사용자 흐름은 제거한다.

## 사용자 기준 변경점

1. `page-editor`와 `page-wizard` 모두 같은 초안 생성 화면에서 시작한다.
2. 주소 입력은 `청첩장 주소` 1필드만 노출한다.
3. 한글 이름만 입력해도 주소가 자동 제안된다.
4. 최종 중복 해소는 서버가 slug suffix를 붙여 확정한다.

## 공통 생성 규칙

- 필수 입력
  - 템플릿
  - 신랑 이름
  - 신부 이름
  - 청첩장 주소
- 주소 규칙
  - 영문 소문자, 숫자, 하이픈(`-`)만 허용
  - 최소 3자, 최대 40자
  - 예약어 금지
  - 중복이면 생성 시 서버가 최종 slug를 자동 조정
- 자동 제안 규칙
  - 이름을 slug로 정규화할 수 있으면 그 값을 우선 사용
  - 정규화 결과가 비어 있으면 `wedding-<seed>` 형식 fallback 사용
- 편집 진입 규칙
  - 초안 생성 후 `/page-editor/{slug}` 또는 `/page-wizard/{slug}`로 이동

## page-wizard 수정 목록

- `src/app/page-wizard/page.tsx`
  - 직접 wizard를 여는 대신 공통 초안 생성 화면으로 변경
- `src/app/_components/InvitationDraftSetupClient.tsx`
  - 주소 1필드 중심 UX로 정리
  - 한글 이름 기반 주소 자동 제안 추가
  - 주소 helper text와 미리보기 추가
- `src/lib/invitationPageSlug.ts`
  - 웹/모바일 공통으로 재사용 가능한 주소 자동 제안 helper 추가

## 관리자 / repository 상태

이번 단계에서 **웹 생성 규칙 정리와 진입 흐름 통일은 반영했지만**, 웹 관리자 전체를 repository 기반으로 완전히 전환한 것은 아니다.

현재도 아래 영역은 브라우저 서비스에서 Firestore를 직접 다룬다.

- `src/services/invitationPageService.ts`
- `src/services/passwordService.ts`
- `src/app/page-editor/PageEditorClient.tsx`
- `src/app/page-wizard/PageWizardClient.tsx`
- `src/app/admin/_hooks/useAdminData.ts`

이유는 현재 웹 관리자에 **서버가 신뢰할 수 있는 admin session / admin API 인증 계층이 없기 때문**이다. 모바일은 server token 기반으로 API를 거치지만, 웹 관리자는 Firebase client auth + Firestore rules 조합에 더 가깝다.

## 다음 전환 우선순위

1. 웹 관리자용 server auth 정책 확정
2. 관리자 전용 API에서 admin 인증 검증 추가
3. `invitationPageService` / `passwordService`를 API 소비자 형태로 전환
4. `page-editor`, `page-wizard`, 관리자 대시보드를 repository 기반 API만 보도록 정리
