# 관리자 대시보드 탭 배치

## 현재 구조
- 상단 첫 줄은 `고객 관리`, `이벤트 운영` 전환만 담당한다.
- `이벤트 운영`일 때 바로 아래 줄에 서비스 탭(`청첩장`, `돌잔치`, `생일`, `일반 행사`, `개업`)이 표시된다.
- 실제 패널 전환은 그 아래 세부 관리 탭이 담당한다.

## 구현된 서비스 탭
- `invitation`
  - `eventType === 'wedding'` 페이지를 청첩장 운영 대상으로 본다.
  - wedding variant shortcut, 공개 상태, 삭제, 등급 변경, 댓글, 이미지, 노출 기간을 관리한다.
- `birthday`
  - `eventType === 'birthday'` 페이지를 생일 운영 대상으로 본다.
  - 생성 버튼은 `/page-wizard?eventType=birthday`로 연결한다.
  - 페이지 목록과 댓글 목록은 birthday slug만 필터링한다.
  - 이미지와 노출 기간 매니저는 `eventTypeFilter="birthday"` 범위만 표시한다.
  - 공개 미리보기는 `/slug/birthday-minimal`, `/slug/birthday-floral` 링크를 제공한다.
- `first-birthday`
  - `eventType === 'first-birthday'` 페이지를 돌잔치 운영 대상으로 본다.
  - 선행 작업에서 관리자 필터가 연결되어 있으며 세부 정책은 돌잔치 문서 기준을 따른다.
- `general-event`
  - `eventType === 'general-event'` 페이지를 일반 행사 운영 대상으로 본다.
  - 생성 버튼은 `/page-wizard?eventType=general-event`로 연결한다.
  - 페이지 목록과 댓글 목록은 general-event slug만 필터링한다.
  - 이미지와 노출 기간 매니저는 `eventTypeFilter="general-event"` 범위만 표시한다.

## TODO 서비스 탭
- `opening`

TODO 서비스는 잘못된 wedding 관리 화면이 뜨지 않도록 준비 중 패널로 막는다. 단, 이벤트 타입 registry나 별도 renderer가 이미 존재하더라도 이 문서 기준의 관리자 운영 탭 승격은 별도 작업으로 본다.

## 조회 정책
- 관리자 로그인 권한 확인은 `/api/admin/session`에서 Firebase ID token을 검증한다.
- 관리자 요약은 `/api/admin/dashboard/summary`를 사용한다.
- 관리자 페이지 목록은 `/api/admin/pages`를 사용한다.
- 관리자 방명록 목록은 `/api/admin/comments`를 사용한다.
- 관리자 요약, 페이지 목록, 댓글 목록, 고객 계정 목록은 React Query 기반이며 `staleTime 45초`, `gcTime 10분`, `refetchOnWindowFocus: false`를 사용한다.

## 회귀 기준
- `/admin?section=events&pageCategory=invitation&tab=pages`는 wedding 페이지만 표시한다.
- `/admin?section=events&pageCategory=birthday&tab=pages`는 birthday 페이지만 표시한다.
- `/admin?section=events&pageCategory=first-birthday&tab=pages`는 first-birthday 페이지만 표시한다.
- `/admin?section=events&pageCategory=general-event&tab=pages`는 general-event 페이지만 표시한다.
- birthday 댓글 탭은 birthday 페이지 slug에 속한 댓글만 보여준다.
- general-event 댓글 탭은 general-event 페이지 slug에 속한 댓글만 보여준다.
- birthday 이미지/노출 기간 탭은 birthday 페이지 범위만 보여준다.
- general-event 이미지/노출 기간 탭은 general-event 페이지 범위만 보여준다.
