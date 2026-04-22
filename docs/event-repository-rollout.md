# Event Repository Rollout

## 목적
- Next 서버에서 Firestore 경로 직접 접근을 저장소 계층으로 감싼다.
- 기존 컬렉션과 향후 `events` 구조 판단을 repository 내부로 숨긴다.
- Expo와 기존 API 계약은 최대한 유지한다.

## 저장소 인터페이스
- `EventRepository`
  - 페이지 본문 조회/저장
  - registry 조회/저장
  - display period 조회/저장
  - slug 중복 확인
- `EventSecretRepository`
  - 페이지 비밀번호 레코드 조회/저장
- `EventCommentRepository`
  - 방명록 목록 조회
  - 단건 조회/수정/삭제
- `EventTicketRepository`
  - 티켓 조회
  - 증감/이동
- `EventLinkTokenRepository`
  - 1회용 링크 토큰 생성
  - 해시 조회
  - 소진/폐기
- `EventAuditLogRepository`
  - 고위험 작업 로그 기록
- `BillingFulfillmentRepository`
  - 결제 이행 락 획득
  - 이행 상태 조회/갱신

## Firestore adapter 초안
- 현재 adapter는 legacy 컬렉션을 source of truth로 유지한다.
- repository 내부에서만 아래 경로를 직접 다룬다.
  - `invitation-page-configs`
  - `invitation-page-registry`
  - `display-periods`
  - `client-passwords`
  - `guestbooks/{pageSlug}/comments`
  - `page-ticket-balances`
  - `mobile-client-editor-link-tokens`
  - `mobile-client-editor-audit-logs`
  - `mobile-billing-fulfillments`
- read-through가 적용된 영역은 신규 `events` 구조를 먼저 조회하고, 결과가 없으면 legacy 컬렉션으로 fallback 한다.
  - 페이지 조회/slug 확인
  - 비밀번호 조회
  - 방명록 조회
  - 링크 토큰 조회
  - 감사 로그 조회
- write-through가 적용된 영역은 legacy write 성공 후 `events` 구조 mirror write를 수행한다.
  - registry 저장
  - display period 저장
  - 본문 저장
  - 비밀번호 저장
  - 방명록 상태 변경/삭제
  - 링크 토큰 발급/소진/폐기
  - 감사 로그 저장
- mirror write 실패 시 1회 즉시 재시도하고, 끝까지 실패하면 `event-write-through-failures`에 partial failure를 남긴다.

## DTO / fallback helper
- `src/server/repositories/eventReadThroughDtos.ts`
  - `events/{eventId}` 문서를 기존 페이지/비밀번호/방명록/링크 토큰 DTO로 변환한다.
- `src/server/repositories/readThrough.ts`
  - `preferred -> fallback` 공통 read-through helper를 제공한다.
- `src/server/repositories/writeThroughCore.ts`
  - retry / partial failure 정책이 들어간 순수 write-through core helper다.
- `src/server/repositories/writeThrough.ts`
  - Firestore partial failure 기록을 붙인 서버용 wrapper다.
- `scripts/test-event-readthrough.mts`
  - DTO 변환과 fallback helper가 기대대로 동작하는지 확인하는 검증 스크립트다.
- `scripts/test-event-write-through.mts`
  - legacy 우선, mirror 재시도, partial failure 기록 동작을 확인하는 검증 스크립트다.

## 현재 연결 지점
- 페이지 조회/저장, slug 확인
  - `src/server/invitationPageServerService.ts`
- 비밀번호 검증/업데이트
  - `src/server/clientPasswordServerService.ts`
- 모바일 방명록 조회/카운트
  - `src/server/clientEditorMobileApi.ts`
- 웹/모바일 방명록 상태 변경 라우트
  - `src/app/api/client-editor/pages/[slug]/comments/[commentId]/route.ts`
  - `src/app/api/mobile/client-editor/pages/[slug]/comments/[commentId]/route.ts`
- 티켓 조회/증감/이동
  - `src/server/pageTicketServerService.ts`
- 모바일 결제 이행
  - `src/server/mobileBillingServerService.ts`
- 1회용 앱 연동 링크 발급/검증
  - `src/server/mobileClientEditorLinkToken.ts`
- 고위험 작업 audit log
  - `src/server/mobileClientEditorHighRisk.ts`

## 남은 작업
- `eventSlugIndex` redirect/alias 정책 확장
- 기존 컬렉션과 `events` 구조 병행 기록 및 백필 전략 도입
- write-through failure replay 도구 추가

## Slug Index Rollout
- slug 기반 조회는 `eventSlugIndex/{slug}`를 먼저 읽고, 없을 때만 legacy `events` 문서를 읽어 index를 복구한다.
- `resolveStoredEventBySlug`, `resolveEventIdBySlug`, `isSlugTaken`은 index 우선 흐름을 기준으로 동작한다.
- `findEventSummaryBySlugQuery`는 운영 조회 경로가 아니라, index가 아직 없는 레거시 데이터를 복구할 때만 사용한다.
