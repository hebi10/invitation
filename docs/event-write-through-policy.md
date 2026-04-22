# Event Write-Through Policy

## 목적
- 기존 Firestore 컬렉션을 운영 기준(source of truth)으로 유지하면서 `events` 구조를 병행 채운다.
- 읽기는 `events` 우선, 쓰기는 `legacy 우선 -> events mirror` 순서로 전환한다.
- mirror 실패가 전체 사용자 작업 실패로 바로 번지지 않도록 partial failure 기준을 고정한다.

## source of truth
- 초기 기준 저장소는 기존 컬렉션이다.
  - `invitation-page-configs`
  - `invitation-page-registry`
  - `display-periods`
  - `client-passwords`
  - `guestbooks/{pageSlug}/comments`
  - `mobile-client-editor-link-tokens`
  - `mobile-client-editor-audit-logs`
- `events`, `eventSecrets`, `eventSlugIndex`는 mirror 대상이다.
- 안정화 전까지 API 성공/실패 판단은 legacy write 결과를 기준으로 한다.

## dual write 대상
- 이벤트 생성 / 본문 저장
- registry 저장
- display period 저장
- 비밀번호 저장
- 방명록 상태 변경 / 삭제
- 1회용 링크 토큰 발급 / 소진 / 폐기
- 고위험 audit log 기록

## 처리 순서
1. legacy write 실행
2. 성공하면 `events` 구조 mirror write 실행
3. mirror write 실패 시 1회 즉시 재시도
4. 재시도까지 실패하면 partial failure로 기록
5. legacy write가 성공했다면 사용자 응답은 성공으로 유지

## partial failure 정책
- legacy write 실패
  - 즉시 요청 실패 처리
  - mirror write는 시도하지 않는다
- legacy 성공 + mirror 실패
  - 사용자 응답은 성공 유지
  - 서버 로그에 에러 출력
  - `event-write-through-failures` 컬렉션에 실패 기록 저장

## 실패 기록 구조
- 컬렉션: `event-write-through-failures`
- 주요 필드
  - `operation`
  - `pageSlug`
  - `eventId`
  - `sourceOfTruth`
  - `legacyCollection`
  - `eventCollection`
  - `payload`
  - `attemptCount`
  - `errorMessage`
  - `errorStack`
  - `createdAt`
  - `updatedAt`

## 재시도 전략
- 서버 요청 내부에서 1회 즉시 재시도한다.
- 그 이후는 자동 재시도하지 않는다.
- 누적된 실패 문서는 다음 단계에서 replay 스크립트 또는 백필 스크립트로 재처리한다.

## 구현 위치
- 공통 helper: `src/server/repositories/writeThrough.ts`
- DTO / slug 해석: `src/server/repositories/eventReadThroughDtos.ts`, `src/server/repositories/eventRepository.ts`
- 검증 스크립트:
  - `npm run test:readthrough-repositories`
  - `npm run test:write-through-repositories`

## Slug Index Mirror
- 본문/registry/display period mirror write는 `events/{eventId}`와 함께 `eventSlugIndex/{slug}`도 동기화한다.
- slug index는 `eventId`, `eventType`, `status`를 저장하고, 충돌 시 `EventSlugIndexConflictError`로 같은 slug의 중복 소유를 막는다.
- redirect 상태는 `targetSlug`가 반드시 있어야 하며, 일반 저장 흐름은 `active` 상태만 생성한다.
