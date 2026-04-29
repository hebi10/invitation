# 이벤트 도메인 현재 기준

## 목적
- 이벤트 마이그레이션이 정착된 뒤 신규 개발자가 먼저 볼 기준 문서를 하나로 줄인다.
- 과거 `legacy-primary`, read-through, write-through 전환 이력은 운영 판단 기준이 아니므로 이 문서에 필요한 결론만 남긴다.

## Source Of Truth
- 이벤트 메타와 공개 상태: `events/{eventId}`
- 이벤트 본문: `events/{eventId}/content/current`
- 공개 주소 해석: `eventSlugIndex/{slug}` -> `eventId`
- 고객 소유권: `events/{eventId}.ownerUid`
- 결제 이행: `billingFulfillments/{transactionId}`
- API rate limit: `rateLimits/{keyHash}`
- 추억 페이지: `memory-pages/{slug}` 별도 도메인

## Repository Boundary
- API, server service, customer/mobile/admin 흐름은 Firestore를 직접 호출하지 않고 `src/server/repositories/*` 또는 클라이언트 repository를 거친다.
- `src/server/repositories/` 바깥의 서버 직접 Firestore 접근은 `npm run test:api-repository-boundary`에서 차단한다.
- 공개 방명록 작성은 `POST /api/guestbook/comments`만 허용하고, Firestore rules는 클라이언트 직접 create를 막는다.
- Storage 공개 `get`은 Firestore 공개 상태와 표시 기간에 연동하고, `list`는 관리자 또는 소유자 관리 흐름만 허용한다.

## Data Contract
- `events/{eventId}`는 `slug`, `eventType`, `displayName`, `published`, `defaultTheme`, `productTier`, `features`, `createdAt`, `updatedAt`을 기본 메타로 가진다.
- 표시 기간은 `displayPeriod` 또는 호환 필드에서 읽되, 공개 조회 판단은 `events` 문서의 공개 상태와 표시 기간을 함께 본다.
- 본문 원본은 `events/{eventId}/content/current`의 `config`가 기준이며, 공개 렌더러와 편집기는 repository mapper를 통해 정규화된 값을 사용한다.
- `eventSlugIndex/{slug}`는 `eventId`, `slug`, `updatedAt`을 보유하고 공개 URL의 유일한 slug lookup 경로다.
- 고객 편집 권한은 Firebase Auth UID와 `events/{eventId}.ownerUid` 일치 여부로 판단한다.

## 운영 기준
- 기본 운영 모드는 `event-only`다. legacy 컬렉션을 fallback 또는 rollback 기준으로 삼지 않는다.
- read-through/write-through, slug index backfill, legacy 삭제 이력은 새 작업 판단 기준이 아니라 장애 분석용 배경이다.
- 배포 전환과 운영 점검은 `event-rollout-monitoring.md`와 실제 스크립트를 기준으로 확인한다.

## 검증 명령
- `npm run qa:event-rollout`
- `npm run test:service-repository-boundary`
- `npm run typecheck:web`
- `npm run lint:web`
