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
  - 방명록 조회/등록/삭제 예정 처리
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

## 남겨둔 예외
- `memoryPageService`는 Firestore 경로는 repository로 분리했지만, Storage 업로드/삭제는 도메인 서비스에 남겨뒀다.
- 서버 전용 `src/server/repositories/*`는 별도 rollout 문서 기준으로 관리한다.
- `memory-pages`는 이벤트 도메인과 합치지 않고 별도 유지한다.

## 검증
- `npm run test:service-repository-boundary`
- `npm run typecheck:web`
- `npm run lint:web`
