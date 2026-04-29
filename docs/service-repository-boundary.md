# Service Repository Boundary

## 목적
- `src/services`가 Firestore 컬렉션 경로를 직접 알지 않게 정리한다.
- 서비스는 도메인 동작만 조합하고, 저장 위치와 fallback 전략은 repository가 책임진다.
- 신규 기능은 repository 인터페이스만 의존하도록 유도한다.

## 적용 범위
- `src/services/invitationPageService.ts`
- `src/services/passwordService.ts`
- `src/services/commentService.ts`
- `src/services/adminAuth.ts`
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
- `src/services/repositories/clientPasswordRepository.ts`
  - 페이지 비밀번호 조회/저장
- `src/services/repositories/commentRepository.ts`
  - 방명록 조회/서버 API 등록/삭제 예정 처리
- `src/services/repositories/adminUserRepository.ts`
  - 관리자 활성 여부 조회
- `src/services/repositories/memoryPageRepository.ts`
  - 추억 페이지 Firestore 문서 조회/저장/삭제

## mapper / validator / utility
- mappers
  - `mappers/invitationPageRepositoryMapper.ts`
  - `mappers/clientPasswordRepositoryMapper.ts`
  - `mappers/commentRepositoryMapper.ts`
- validator
  - `repositoryValidators.ts`
- shared error
  - `repositoryErrors.ts`
- compare utility
  - `repositoryCompare.ts`

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
- 관리자 요약/삭제/비밀번호 보조 조회/관리자 사용자 확인은 `src/server/repositories/admin*Repository.ts`와 `eventSecretRepository`를 통해 Firestore 경로를 다룬다.

## Rate limit 경계
- API rate limit 상태는 `src/server/repositories/rateLimitRepository.ts`가 Firestore `rateLimits` 컬렉션에 저장한다.
- `src/server/requestRateLimit.ts`는 키 구성과 fallback만 담당하고 Firestore 컬렉션 경로를 직접 알지 않는다.
- Firebase 비활성 로컬 환경에서만 프로세스 메모리 fallback을 허용한다.

## 고객 소유 이벤트 조회 경계
- `/my-invitations`의 내 청첩장 목록은 클라이언트 Firestore 직접 조회 대신 `/api/customer/events`를 통해 서버 Admin SDK로 읽는다.
- 고객 조회 API는 Firebase ID token을 `Authorization: Bearer`로 전달하고 서버에서 검증한 UID의 `ownerUid`와 일치하는 이벤트만 반환한다.
- 기존 청첩장 claim 성공 후에는 내 청첩장 목록 캐시를 무효화하고 서버 목록을 다시 읽은 뒤 `/page-wizard/[slug]` 관리 화면으로 이동한다.
- `/page-wizard/[slug]`, `/page-wizard/[slug]/result`, `/page-editor/[slug]`의 비관리자 소유권/편집 설정 확인은 `/api/customer/events/[slug]/ownership`, `/api/customer/events/[slug]/editable` 서버 API를 사용한다.
- claim 직후 편집 화면 전환은 클라이언트 Firestore 규칙 전파나 slug index 읽기에 의존하지 않고, 서버 Admin SDK가 확인한 owner/config 상태를 기준으로 한다.
- `/api/customer/events/claim` 성공 응답은 가능한 경우 서버가 확인한 editable config를 함께 내려주며, 고객 위저드는 이 config를 즉시 적용한다.
- 고객 위저드 진입 시 Storage listing fallback과 클라이언트 Firestore 이미지 정리 저장은 실행하지 않는다.
- 고객 위저드의 이미지 업로드는 Firebase 로그인 계정의 이벤트 소유권을 Storage rules가 확인하는 직접 업로드 경로를 사용한다.
- 고객 위저드는 editable API가 `claimable`을 먼저 반환해도 `/api/customer/events` 소유 목록 확인이 끝나기 전에는 비밀번호 claim 카드를 렌더링하지 않는다.
- slug index가 오래되어 먼저 찾은 이벤트의 `ownerUid`가 비어 있어도, 현재 UID가 같은 slug의 이벤트 summary를 소유하고 있으면 고객 편집 API는 `claimable`보다 owner를 우선 인정한다.
- owner 이벤트의 editable config가 비어 있고 같은 slug의 sample config가 있으면 고객 편집 API는 sample 기반 config를 반환해 비밀번호 claim 루프로 보내지 않는다.
- 위저드 클라이언트도 `/api/customer/events` 소유 목록에 같은 slug가 있으면 claimable 응답을 그대로 믿지 않고 소유 이벤트 fallback config를 적용한다.

## 고객 이용권 지갑 경계
- 고객 제작권과 운영 티켓 지급/소비 이력은 `src/server/repositories/customerWalletRepository.ts`가 Firestore `customerWallets` 경로를 전담한다.
- 관리자 지급은 `/api/admin/customers/wallet`을 통해서만 처리하고, 클라이언트는 `src/services/adminCustomerService.ts` 공개 함수를 호출한다.
- 고객 지갑 조회는 `/api/customer/wallet`을 통해 서버가 Firebase ID token을 검증한 UID 기준으로만 반환한다.
- 고객 청첩장 생성 API는 `/api/customer/events` `POST`에서 제작권 1개를 차감한 뒤 이벤트 초안을 만들고 소유권을 연결하며, 중간 실패 시 생성된 초안 정리와 제작권 환불을 시도한다.
- 모바일 티켓팩 결제는 이벤트 잔액 적립을 유지하되, 고객 계정에 연결된 이벤트라면 지갑 원장에도 구매/배정 이력을 남긴다.

## 남겨둔 예외
- `memoryPageService`는 Firestore 경로는 repository로 분리했지만, Storage 업로드/삭제는 도메인 서비스에 남겨뒀다.
- 서버 전용 `src/server/repositories/*`는 별도 rollout 문서 기준으로 관리한다.
- `memory-pages`는 이벤트 도메인과 합치지 않고 별도 유지한다.

## 검증
- `npm run test:service-repository-boundary`
- `npm run typecheck:web`
- `npm run lint:web`
