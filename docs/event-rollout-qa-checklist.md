# Event Rollout QA Checklist

## 목적
- `events` read-through / write-through 전환 이후에도 기존 청첩장과 신규 이벤트가 같은 API 계약으로 동작하는지 확인한다.
- 자동 검증으로 막을 수 있는 회귀와, 실제 Firebase/딥링크 환경에서만 확인 가능한 수동 시나리오를 분리한다.
- 컷오버 전 장애 기준과 롤백 기준을 명확히 남긴다.

## 자동 검증 명령

### 기본 QA 게이트
```bash
npm run qa:event-rollout
```

포함 범위:
- API -> repository 경계 검증
- read-through fallback 검증
- write-through / partial failure 검증
- slug index lookup / 충돌 검증
- 백필 계획 검증
- web / mobile lint, typecheck

### 릴리스 직전 추가 권장
```bash
npm run test:smoke
```

포함 범위:
- `sync-memory-metadata`
- `next build`

## 자동 검증 체크리스트
- [ ] `npm run qa:event-rollout` 성공
- [ ] `npm run test:smoke` 성공
- [ ] `test:readthrough-repositories`에서 신규 우선, legacy fallback 모두 통과
- [ ] `test:write-through-repositories`에서 partial failure 기록 경로까지 통과
- [ ] `test:slug-index`에서 index 누락 복구, 중복 차단 통과
- [ ] `test:event-backfill`에서 dry-run 계획과 validate 변환 규칙 통과
- [ ] `test:api-repository-boundary`에서 `src/app/api`, `src/server` direct Firestore 접근 없음
- [ ] `typecheck:web`, `lint:web`, `typecheck:mobile`, `lint:mobile` 통과

## 수동 QA 시나리오

### 1. 기존 데이터만 있는 청첩장
- [ ] 기존 청첩장 로그인
  - 입력: 기존 `slug` 또는 전체 URL + 비밀번호
  - 기대: 로그인 성공, 기존 DTO 응답 유지, `/manage` 진입 가능
- [ ] 기존 청첩장 편집
  - 입력: 본문 수정, 공개 상태/노출 기간 수정, 이미지/방명록 관리
  - 기대: legacy write 성공 후 신규 `events` mirror 문서가 채워짐
- [ ] slug 조회
  - 입력: index가 없는 기존 slug 조회
  - 기대: legacy fallback 성공, 필요 시 `eventSlugIndex` 복구

### 2. 신규 `events` 데이터만 있는 이벤트
- [ ] 신규 이벤트 생성
  - 입력: 웹 또는 모바일에서 주소 1필드 기준 생성
  - 기대: `events/{eventId}` 계층과 `eventSlugIndex/{slug}` 생성
- [ ] 신규 이벤트 로그인 / 편집
  - 기대: legacy 컬렉션에 의존하지 않고 조회/편집 가능
- [ ] slug 조회
  - 입력: 신규 slug 조회
  - 기대: index -> eventId -> events 경로로 정상 응답

### 3. 모바일 연동 / 재연동
- [ ] 최근 연동 목록으로 재진입
  - 기대: 기존 카드 데이터로 세션 복원 가능
- [ ] 1회용 링크 발급 후 모바일 재연동
  - 기대: 링크 1회 사용 후 `/manage` 진입, 재사용 시 실패
- [ ] 링크 토큰 만료 처리
  - 기대: 만료된 링크는 명확한 에러 반환, 세션 발급 금지
- [ ] 앱 설치/미설치 딥링크
  - 설치 상태: 앱으로 진입
  - 미설치 상태: 웹 fallback 페이지 노출

### 4. 방명록 / 고위험 작업
- [ ] 방명록 `숨김 -> 복구 -> 삭제 예정` 전환
  - 기대: public / hidden / pending_delete 상태가 일관되게 반영
- [ ] 삭제 예정 댓글 lazy purge
  - 기대: 보관 기간 만료 후 운영 조회 시 정리
- [ ] 고위험 작업 재인증
  - 기대: 비밀번호 재입력 후 10분 내 step-up 세션만 허용

### 5. 결제 / 이행
- [ ] 결제 이행 중복 호출
  - 기대: 동일 transactionId 재호출 시 중복 부여 없음
- [ ] 생성/티켓 지급 결과 확인
  - 기대: billing fulfillment 상태와 event mirror 데이터가 일치

## 장애 케이스 목록
- `qa:event-rollout` 실패
  - 의미: 저장소 경계, read-through, write-through, slug index, 타입 안정성 중 하나가 깨진 상태
- `test:smoke` 실패
  - 의미: 실제 배포 전 Next build 회귀 가능성 존재
- legacy login 성공 / 신규 mirror 미생성
  - 의미: write-through partial failure 누적 또는 mirror adapter 문제
- 신규 이벤트는 보이는데 기존 이벤트 slug lookup 실패
  - 의미: read-through fallback 또는 slug index 복구 로직 문제
- 링크 토큰 재사용 가능
  - 의미: `usedAt` 처리 또는 exchange 차단 누락
- 방명록 상태는 바뀌는데 public 조회에 그대로 노출
  - 의미: comment status 필터링 누락
- 결제 이행 중복 호출 시 티켓/생성 중복
  - 의미: fulfillment idempotency 회귀

## 롤백 기준
- 아래 중 하나라도 발생하면 신규 구조를 source of truth로 승격하지 않고 legacy 우선 운영 유지
  - `qa:event-rollout` 또는 `test:smoke` 실패
  - 기존 청첩장 로그인/편집 실패
  - 신규 이벤트 생성 후 재조회 실패
  - slug index 충돌 또는 잘못된 이벤트 연결 확인
  - 링크 토큰 만료/재사용 제어 실패
  - 결제 이행 중복 차단 실패

## 운영 롤백 절차
1. 신규 구조 승격 플래그/읽기 우선순위를 유지하거나 legacy 우선으로 되돌린다.
2. `event-write-through-failures`를 확인해 partial failure 범위를 식별한다.
3. 필요 시 `backfill:events -- validate`로 신규 mirror 상태를 다시 점검한다.
4. 장애 구간이 write-through mirror에 한정되면 legacy 데이터를 기준으로 서비스 연속성을 유지한다.
5. 문제 수정 후 `qa:event-rollout`, `test:smoke`, 대표 수동 시나리오를 다시 통과시킨 뒤 재시도한다.

## 증적 기록 권장
- 실행 명령과 성공 여부
- 실패한 slug / eventId / transactionId / tokenId
- `event-write-through-failures` 존재 여부
- 앱 설치/미설치 딥링크 확인 결과
- 대표 시나리오별 스크린샷 또는 로그
