# 복구 가능한 이벤트 삭제 작업 설계

## 목표

관리자 이벤트 완전 삭제를 복구 가능한 단계형 작업으로 전환한다. 삭제 도중 일부 저장소 작업이 실패하더라도 이벤트가 다시 공개되거나 편집되지 않게 하고, 완료된 단계를 반복하지 않으면서 안전하게 재시도할 수 있어야 한다.

## 범위

이번 단계는 전반적인 프로젝트 개선 중 첫 번째인 삭제 무결성만 다룬다.

- 관리자 완전 삭제 요청의 중복 방지
- 이벤트 삭제 대기 상태와 삭제 작업 기록
- 단계별 checkpoint와 멱등성 재시도
- 삭제 진행·실패·재시도 관리자 UI
- 삭제 진행 중 공개·편집 차단
- 에뮬레이터 및 정책 회귀 테스트

관리자 조회 페이지네이션, 일괄 운영, 탭 키보드 탐색, 필터 재구성은 후속 단계로 남긴다.

## 제약 조건

- Next.js와 Firebase의 현재 기술 스택을 유지한다.
- 새로운 외부 큐나 런타임 의존성을 추가하지 않는다.
- 공개 route와 기존 API 응답의 핵심 구조를 임의로 변경하지 않는다.
- 기존 repository 및 서버 서비스 경계를 우선 사용한다.
- `deletionState`가 없는 기존 이벤트는 정상 상태로 해석한다.
- 작업 실패 시 내부 오류, 저장 경로, 민감 정보를 사용자에게 노출하지 않는다.

## 상태 모델

이벤트에는 선택적인 삭제 상태를 둔다.

```ts
type EventDeletionState = 'pending' | 'failed';

interface EventDeletionMetadata {
  deletionState?: EventDeletionState;
  deletionJobId?: string;
  deletionRequestedAt?: string;
}
```

삭제 작업 문서는 서버 전용 컬렉션 `event-deletion-jobs/{jobId}`에 저장한다.

```ts
type EventDeletionStep =
  | 'block-access'
  | 'delete-comments'
  | 'delete-images'
  | 'delete-ownership-references'
  | 'delete-content-and-indexes'
  | 'delete-event-root';

type EventDeletionJobStatus = 'pending' | 'running' | 'failed' | 'completed';

interface EventDeletionJob {
  id: string;
  slug: string;
  status: EventDeletionJobStatus;
  currentStep: EventDeletionStep;
  completedSteps: EventDeletionStep[];
  requestedBy: string;
  requestedAt: string;
  updatedAt: string;
  completedAt?: string;
  errorCode?: string;
}
```

`errorCode`는 허용된 서버 오류 코드만 저장한다. 원본 예외 메시지와 스택은 서버 로그에만 남긴다.

## 데이터 흐름

1. 관리자가 이벤트 상세 화면에서 완전 삭제를 확인한다.
2. API가 관리자 인증과 대상 이벤트의 현재 상태를 확인한다.
3. 활성 삭제 작업이 이미 존재하면 새 작업을 만들지 않고 기존 작업 ID와 상태를 반환한다.
4. 활성 작업이 없으면 작업 문서를 만들고 이벤트에 `deletionState: pending`, 작업 ID, 요청 시각을 기록한다.
5. 서버 서비스가 고정된 순서로 삭제 단계를 실행한다.
6. 단계가 끝날 때마다 `completedSteps`와 `currentStep`을 갱신한다.
7. 실패하면 작업을 `failed`, 이벤트를 `failed`로 표시하고 공개·편집 차단을 유지한다.
8. 재시도 요청은 완료된 단계를 건너뛰고 실패한 단계부터 다시 시작한다.
9. 모든 하위 데이터와 참조를 정리한 뒤 마지막에 이벤트 루트를 삭제한다.
10. 작업 문서는 `completed` 상태와 최소 감사 정보만 보존한다.

## 단계 책임

### 1. block-access

이벤트 삭제 상태를 기록한 시점부터 공개 조회, 고객 편집, 소유권 변경을 거절한다. 공개 라우트는 기존의 비공개 또는 찾을 수 없음 동작을 사용하고, 편집 API는 사용자용 오류 코드로 응답한다.

### 2. delete-comments

방명록과 댓글 하위 컬렉션을 삭제한다. 대상이 이미 없으면 성공으로 처리한다.

### 3. delete-images

이미지 메타데이터와 삭제 가능한 저장소 객체를 정리한다. 이미 삭제된 객체는 성공으로 처리하고, 권한·네트워크 실패는 작업 실패로 기록한다.

### 4. delete-ownership-references

고객 소유권, 초대 링크, 지갑이나 연결 인덱스 등 이벤트를 참조하는 문서를 정리한다. 각 batch가 재실행 가능해야 하며, 문서 부재는 성공이다.

### 5. delete-content-and-indexes

이벤트 콘텐츠와 slug·검색·요약 인덱스를 정리한다. 후속 재시도에서 이미 제거된 인덱스를 오류로 취급하지 않는다.

### 6. delete-event-root

모든 선행 단계의 checkpoint가 확인된 경우에만 이벤트 루트를 제거한다. 이 단계 이후 작업 문서를 `completed`로 전환한다.

## 서버 책임과 경계

`adminEventDeletionService`는 작업 생성, 단계 순서, checkpoint, 재시도를 조정한다. 실제 데이터 삭제는 기존 repository 계층에 둔다.

- API route: 인증, 요청 파싱, 서비스 호출, 사용자 응답
- deletion service: 상태 전이와 단계 orchestration
- repositories: 컬렉션별 조회·삭제와 멱등성
- 공개·편집 정책: 삭제 상태 확인과 접근 차단

작업 생성과 이벤트 `pending` 전환은 Firestore 트랜잭션으로 묶는다. 서로 다른 저장소 객체 삭제는 트랜잭션에 포함할 수 없으므로 checkpoint 기반 재시도로 보장한다.

## API 동작

기존 삭제 endpoint를 유지한다. 최초 요청은 작업을 생성하고 현재 서버 요청 안에서 실행 가능한 단계까지 처리한다. 실행이 끝나지 않았거나 실패한 경우에도 작업 ID와 정규화된 상태를 응답한다.

재시도는 동일 endpoint에 명시적 retry 요청을 전달하거나 기존 프로젝트 패턴에 맞는 하위 action으로 제공한다. 최종 선택은 실제 route와 gateway 패턴을 구현 계획에서 확정한다.

응답은 기존 성공 소비자를 깨지 않도록 기존 성공 필드를 유지하고 다음 정보를 선택적으로 확장한다.

```ts
interface AdminEventDeletionResult {
  success: boolean;
  deletionJobId?: string;
  deletionStatus?: 'pending' | 'running' | 'failed' | 'completed';
  failedStep?: EventDeletionStep;
  retryable?: boolean;
}
```

## 관리자 UI

- 삭제 요청 직후 목록과 상세에 `삭제 진행 중` 상태를 표시한다.
- 진행 중에는 공개, 고객 연결, 편집, 중복 삭제 동작을 비활성화한다.
- 실패 시 `삭제를 완료하지 못했습니다`와 실패 단계에 맞는 일반화된 설명을 표시한다.
- 재시도 가능한 실패에는 `삭제 다시 시도` 버튼을 제공한다.
- 완료 시 기존 성공 toast를 유지하고 목록에서 항목을 제거한다.
- 비동기 상태 변경은 `aria-live`로 알린다.

## 오류 처리

- 중복 요청은 기존 활성 작업을 반환한다.
- 완료된 단계는 `completedSteps`를 기준으로 건너뛴다.
- 문서나 객체가 이미 없는 경우는 멱등 성공으로 처리한다.
- 실패 시 이벤트의 삭제 차단 상태를 해제하지 않는다.
- 권한 불일치, 데이터 불일치처럼 자동 재시도가 위험한 오류는 `retryable: false`로 반환한다.
- 네트워크, 일시적 저장소 오류는 `retryable: true`로 반환한다.
- 작업 상태 갱신 자체가 실패하면 삭제 루트 단계로 진행하지 않는다.

## 보안

- 작업 생성·조회·재시도는 서버의 관리자 검증을 통과해야 한다.
- 클라이언트가 작업 문서를 직접 생성하거나 상태를 변경할 수 없게 Firestore Rules를 유지하거나 강화한다.
- `requestedBy`는 검증된 관리자 UID로만 기록한다.
- 고위험 삭제에는 기존 관리자 인증 정책을 유지하며 후속 단계에서 최근 로그인 요구를 별도로 검토한다.

## 테스트 전략

모든 동작 변경은 실패하는 테스트를 먼저 추가한다.

1. 최초 요청이 작업 생성과 이벤트 `pending` 전환을 함께 수행한다.
2. 동일 이벤트의 중복 요청이 기존 작업을 재사용한다.
3. 각 단계 완료 후 checkpoint가 저장된다.
4. 중간 실패가 작업과 이벤트를 `failed`로 남긴다.
5. 재시도가 완료된 단계를 건너뛰고 실패 단계부터 실행한다.
6. 이미 삭제된 데이터에 대한 재실행이 성공한다.
7. 삭제 진행 중 공개·고객·모바일 편집 경로가 접근을 거절한다.
8. 모든 단계 완료 후 관련 데이터와 인덱스가 남지 않는다.
9. 관리자 UI가 진행, 실패, 재시도, 완료 상태를 올바르게 표시한다.
10. 기존 security, architecture, emulator 테스트가 통과한다.

## 완료 기준

- 중간 실패 후 같은 작업 ID로 삭제를 재개할 수 있다.
- 삭제 진행 중 이벤트가 공개되거나 편집되지 않는다.
- 중복 요청이 별도의 삭제 작업을 만들지 않는다.
- 완료된 단계가 재시도에서 중복 실행되지 않는다.
- 최종 완료 후 이벤트와 관련 참조가 남지 않는다.
- 사용자에게 내부 오류 정보가 노출되지 않는다.
- 관련 테스트, 웹 타입 검사, 린트, 빌드가 통과한다.

## 후속 작업

삭제 무결성 구현과 검증이 끝난 뒤 다음 순서로 별도 설계·구현한다.

1. 관리자 조회 서버 페이지네이션과 N+1 제거
2. 이벤트 일괄 선택과 안전한 batch action
3. 상세 tablist 키보드 규약
4. 필터 progressive disclosure와 운영 도움말
