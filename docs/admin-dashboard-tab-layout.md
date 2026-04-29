# 관리자 대시보드 탭 배치

## 현재 구조

- 상단 첫 줄은 `고객 관리`, `이벤트 운영` 전환만 담당합니다.
- `이벤트 운영`일 때만 바로 아래 줄에 서비스 탭(`청첩장`, `돌잔치`, `생일`, `일반 행사`, `개업`)이 표시됩니다.
- 실제 패널 전환은 그 아래 세부 관리 탭이 담당합니다.

## 조회 정책

- 관리자 로그인 권한 확인은 클라이언트 Firestore 직접 조회가 아니라 `/api/admin/session`에서 Firebase ID token을 검증한다.
- 관리자 요약은 전용 API(`/api/admin/dashboard/summary`)를 사용합니다.
- 관리자 청첩장 페이지 목록은 전용 API(`/api/admin/pages`)를 사용합니다.
- 관리자 방명록 목록은 전용 API(`/api/admin/comments`)를 사용합니다.
- 관리자 댓글 요약은 Firestore `collectionGroup` 집계 쿼리 대신 `events/{eventId}/comments`를 이벤트별로 읽어 서버에서 공개 댓글만 계산합니다.
- 관리자 요약, 페이지 목록, 댓글 목록, 고객 계정 목록은 모두 React Query 기반이며 `staleTime 45초`, `gcTime 10분`, `refetchOnWindowFocus: false`를 사용합니다.

## 현재 동작

1. 상단 헤더
   - `요약 새로고침` 버튼으로 요약 API만 수동 재조회합니다.
2. 페이지/댓글/고객 계정 탭
   - 각 탭에 `새로고침` 버튼이 따로 있습니다.
   - 버튼은 실제 refetch 중에는 `새로고침 중`, 최초 로딩 중에는 `불러오는 중`으로 바뀝니다.
3. 서비스 탭
   - 서비스 탭을 바꾸면 URL의 `pageCategory`와 아래 세부 관리 탭 라벨이 함께 바뀝니다.
   - 청첩장 외 서비스는 잘못된 wedding 관리 화면이 뜨지 않도록 TODO 패널로 막아 둡니다.
