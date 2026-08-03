# Service Repository Boundary

## 목적
- `src/services`가 Firestore 컬렉션 경로를 직접 알지 않게 정리한다.
- 서비스는 도메인 동작만 조합하고, 저장 위치와 fallback 전략은 repository가 책임진다.
- 신규 기능은 repository 인터페이스만 의존하도록 유도한다.

## 적용 범위
- `src/services/invitationPageService.ts`
- `src/services/commentService.ts`
- `src/services/adminAuth.ts`
- `src/services/customerEventService.ts`
- `src/services/memoryPageService.ts`

## 현재 구조
- service
  - UI와 훅에서 호출하는 공개 API
  - 비즈니스 조합, mock fallback, storage 연계 담당
- repository
  - Firestore 경로, read/write 전략, legacy fallback 담당
- mapper
  - Firestore 문서를 도메인 DTO로 변환
- validator
  - repository 입력값 기본 검증
- compare utility
  - 중복 문서 중 canonical 레코드 선택

## repository 구현체
- `src/services/repositories/invitationPageRepository.ts`
  - 페이지 본문, registry, display period, slug 중복 확인
- `src/services/repositories/commentRepository.ts`
  - 방명록 조회/서버 API 등록/삭제 예정 처리
- `src/services/repositories/adminUserRepository.ts`
  - 관리자 활성 여부 조회
- `src/services/repositories/memoryPageRepository.ts`
  - 추억 페이지 Firestore 문서 조회/저장/삭제

## mapper / validator / utility
- mappers
  - `mappers/invitationPageRepositoryMapper.ts`
  - `mappers/commentRepositoryMapper.ts`
- validator
  - `repositoryValidators.ts`
- shared error
  - `repositoryErrors.ts`

## 호출 흐름
1. UI / 훅이 `src/services/*` 공개 함수를 호출한다.
2. service는 입력 정리와 mock fallback만 처리한다.
3. 실제 Firestore 읽기/쓰기는 `src/services/repositories/*`가 담당한다.
4. repository 내부에서 mapper/validator를 사용해 DTO와 문서 사이를 변환한다.

## 공개 조회 fallback 경계
- `getInvitationPageBySlug`의 공개 방문자 호출은 `includeSeedFallback: false`, `allowSeedFallbackWithFirestore: false`, `requirePublicAccess: true`를 함께 사용한다.
- 서버 공개 라우트는 `sampleFallbackMode: 'when-firestore-unavailable'`로 Firestore 사용 가능 환경의 암묵적 sample fallback을 막는다.
- 공개 라우트 SSR이 검증한 `initialPageConfig`가 있으면 비관리자 클라이언트 Firestore 재조회 실패가 공개 화면을 blocked 상태로 낮추지 않는다.
- 공개 URL에서 관리자 로그인 사용자가 비공개/기간 외 페이지를 볼 때는 `/api/admin/events/[slug]`가 Admin SDK로 private 포함 설정을 읽어 클라이언트 Firestore rules 제한에 막히지 않게 한다.
- 관리자/편집/로컬 preview 흐름은 명시적으로 private 또는 fallback 옵션을 켠 호출부에서만 sample 데이터를 사용할 수 있다.

## Storage 이미지 조회 경계
- 공개 페이지는 `usePageImages` listing fallback을 사용하지 않고 Firestore config의 이미지 URL만 사용한다.
- `getPageImages`/`getAllPageImages`의 Storage `listAll`은 관리자, 소유자, 위자드/관리 화면처럼 명시적 관리 흐름에서만 사용한다.
- Storage rules는 공개 `get`을 Firestore 공개 상태와 연결하고, `list`는 관리자/소유자 관리 권한으로 제한한다.
- Storage/Firestore rules의 공개 기간 판정은 `displayPeriod.isActive`가 명시된 경우 이를 우선하고, 기간 비활성 상태의 오래된 visibility 날짜만으로 공개 이미지를 차단하지 않는다.

## 방명록 쓰기 경계
- 공개 페이지 댓글 등록은 클라이언트 repository가 Firestore에 직접 create하지 않고 `POST /api/guestbook/comments`를 호출한다.
- 서버 API는 `src/server/repositories/eventCommentRepository.ts`를 통해 `events/{eventId}/comments`에만 댓글을 생성한다.
- Firestore rules는 공개 클라이언트의 `events/{eventId}/comments/{commentId}` create를 차단하고, 기존 읽기와 관리자 삭제 예정 처리는 유지한다.
- 서버 API는 이벤트 공개 상태와 노출 기간을 확인한 뒤 이름/메시지 길이, 기본 스팸 패턴, rate limit을 통과한 요청만 저장한다.

## 관리자 조회 경계
- 관리자 페이지 목록은 클라이언트 Firestore 직접 조회 대신 `/api/admin/pages`를 통해 서버 Admin SDK로 읽는다.
- 관리자 방명록 목록은 클라이언트 collection/list 조회 대신 `/api/admin/comments`를 통해 서버 Admin SDK로 읽는다.
- 관리자 로그인 권한 확인과 주요 조회 API는 Firebase ID token을 `Authorization: Bearer`로 전달하고 서버에서 `admin-users` 권한을 확인한다.
- 관리자 요약/삭제/관리자 사용자 확인은 `src/server/repositories/admin*Repository.ts`를 통해 Firestore 경로를 다룬다.

## Rate limit 경계
- API rate limit 상태는 `src/server/repositories/rateLimitRepository.ts`가 Firestore `rateLimits` 컬렉션에 저장한다.
- `src/server/requestRateLimit.ts`는 키 구성과 fallback만 담당하고 Firestore 컬렉션 경로를 직접 알지 않는다.
- Firebase 비활성 로컬 환경에서만 프로세스 메모리 fallback을 허용한다.
- 운영 환경에서는 로그인, 방명록, 이미지 업로드, 모바일 mutation, 결제/링크 토큰 같은 민감 scope가 Firestore rate limit 저장소를 사용할 수 없거나 저장에 실패하면 fail-closed로 차단한다.

## 고객 소유 이벤트 조회 경계
- `/my-invitations`의 내 청첩장 목록은 클라이언트 Firestore 직접 조회 대신 `/api/customer/events`를 통해 서버 Admin SDK로 읽는다.
- 웹 고객 API와 모바일 고객 API는 공통 `src/server/customerApiAuth.ts`의 Firebase ID token 검증을 사용하고, 인증 오류를 일관된 401 응답으로 정규화한다.
- 고객 조회 API는 Firebase ID token을 `Authorization: Bearer`로 전달하고 서버에서 검증한 UID의 `ownerUid`와 일치하는 이벤트만 반환한다.
- `/page-wizard/[slug]`, `/page-wizard/[slug]/result`의 비관리자 소유권/편집 설정 확인은 `/api/customer/events/[slug]/ownership`, `/api/customer/events/[slug]/editable` 서버 API를 사용한다.
- 고객 위저드 진입 시 Storage listing fallback과 클라이언트 Firestore 이미지 정리 저장은 실행하지 않는다.
- 고객 위저드의 이미지 업로드는 Firebase 로그인 계정의 이벤트 소유권을 Storage rules가 확인하는 직접 업로드 경로를 사용한다.
- 고객 위저드는 editable API가 `claimable`을 반환하면 비밀번호 claim을 제공하지 않고 관리자 계정 연결 안내를 표시한다.
- slug index가 오래되어 먼저 찾은 이벤트의 `ownerUid`가 비어 있어도, 현재 UID가 같은 slug의 이벤트 summary를 소유하고 있으면 고객 편집 API는 `claimable`보다 owner를 우선 인정한다.
- owner 이벤트의 editable config가 비어 있고 같은 slug의 sample config가 있으면 고객 편집 API는 sample 기반 config를 반환한다.
- 위저드 클라이언트도 `/api/customer/events` 소유 목록에 같은 slug가 있으면 claimable 응답을 그대로 믿지 않고 소유 이벤트 fallback config를 적용한다.
- `/my-invitations`의 고객 방명록 조회/삭제는 `/api/customer/events/[slug]/comments`와 `/api/customer/events/[slug]/comments/[commentId]`를 사용하고, 서버에서 ownerUid를 다시 확인한다.

## 고객 연결 초대 경계
- 관리자 웹 생성 이벤트는 기존 소유권을 덮어쓰지 않으며 신규 초안만 `ownerUid: null`로 시작한다.
- 관리자는 `/api/admin/events/[slug]/ownership-invite`에서 7일 만료 링크를 발급한다. 원문 토큰은 URL fragment에만 포함하고 Firestore `events/{eventId}/ownershipInvites/current`에는 SHA-256 해시만 저장한다.
- `/connect/[slug]`는 fragment를 브라우저 메모리에서만 읽고 공개 상태 API로 검증한 뒤 로그인 또는 회원가입과 이메일 인증을 안내한다.
- 인증 고객은 `/api/customer/events/[slug]/ownership-invite`에서 링크를 한 번만 소비한다. 서버 Repository 트랜잭션이 현재 소유자와 초대 상태를 함께 확인하고 `ownerUid` 변경과 소비 처리를 원자적으로 기록한다.
- 재발급은 현재 초대 문서를 교체해 이전 링크를 즉시 무효화한다. 사용 완료 후에는 토큰 없는 `/page-wizard/{slug}`로 이동한다.
- 임의의 미연결 slug는 self-claim 대상이 아니다. 관리자 발급 토큰과 인증된 Firebase 고객 신원이 모두 확인되어야 한다.
- Firestore Rules는 익명, 이벤트 소유자, 관리자 브라우저의 `ownershipInvites` 직접 읽기와 쓰기를 모두 차단한다.

## 고객 이용권 지갑 경계
- 고객 제작권과 모바일 초대장 생성 티켓 지급/소비 이력은 `src/server/repositories/customerWalletRepository.ts`가 Firestore `customerWallets` 경로를 전담한다.
- 관리자 지급은 `/api/admin/customers/wallet`을 통해서만 처리하고, 클라이언트는 `src/services/adminCustomerService.ts` 공개 함수를 호출한다.
- 고객 지갑 조회는 `/api/customer/wallet`을 통해 서버가 Firebase ID token을 검증한 UID 기준으로만 반환한다.
- 고객 청첩장 생성 API는 `/api/customer/events` `POST`에서 제작권 1개를 차감한 뒤 이벤트 초안을 만들고 소유권을 연결하며, 중간 실패 시 생성된 초안 정리와 제작권 환불을 시도한다.
- 모바일 티켓팩 결제는 이벤트 잔액 적립을 유지하되, 고객 계정에 연결된 이벤트라면 지갑 원장에도 구매/배정 이력을 남긴다.

## 결제 이행 잠금 경계
- `src/server/repositories/billingFulfillmentRepository.ts`의 잠금 결과는 레코드와 `acquired` 여부를 함께 반환한다.
- 새 요청 또는 실패 상태 재시도만 잠금을 획득하며, 이미 처리 중인 동시 요청은 페이지 생성·티켓 적립 같은 부수효과를 실행하지 않는다.
- 완료된 요청이나 기존 생성 페이지가 있으면 저장된 결과를 재사용해 결제 이행의 멱등성을 유지한다.

## 이미지 업로드 검증 경계
- 서버 편집 이미지 업로드는 `src/server/editableImageUploadService.ts`에서 파일 signature와 실제 byte 기반 형식, 해상도, 픽셀 수를 검증한다.
- Storage Rules는 소유자·관리자 권한, `image/*` MIME, 애플리케이션 정책과 같은 8MB 이하 크기를 검증한다.
- Storage Rules는 파일 byte 내용을 해석하지 못하므로 MIME 위조 방어는 서버 업로드 경로의 byte 검증에 의존한다.

## 남겨둔 예외
- `memoryPageService`는 Firestore 경로는 repository로 분리했지만, Storage 업로드/삭제는 도메인 서비스에 남겨뒀다.
- 서버 전용 `src/server/repositories/*`는 별도 rollout 문서 기준으로 관리한다.
- `memory-pages`는 이벤트 도메인과 합치지 않고 별도 유지한다.

## 검증
- `npm run test:architecture`
- `npm run test:security`
- `npm run test:emulator`
- `npm run typecheck:web`
- `npm run lint:web`
