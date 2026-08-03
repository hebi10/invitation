# 테스트 스위트 통합 설계

## 1. 목적

현재 `package.json`에 개별 테스트와 중첩된 조합 명령이 함께 노출되어 테스트·QA 명령이
57개까지 늘어난 상태를 정리한다. 인증, 권한, 결제, 소유권, 저장소 경계, Firebase Rules와
활성 이벤트 렌더링의 회귀 보호는 유지하면서 package scripts를 역할 중심의 6개 명령으로
줄인다.

이번 작업은 테스트를 적게 보이게 만드는 것만 목표로 하지 않는다. 실행 목록을 한 곳에서
관리하고 CI의 중복 실행을 제거해 어떤 검증이 기본, 보안, 아키텍처, 에뮬레이터 범위인지
명확하게 만든다.

## 2. 채택한 접근법

### 채택: suite runner 중심 통합

- `scripts/run-test-suite.mjs`가 테스트 파일과 suite 분류의 단일 기준이 된다.
- 개별 테스트 파일은 package script 없이도 runner의 테스트 ID로 실행할 수 있다.
- 기본 `npm test`는 에뮬레이터를 제외한 전체 빠른 suite를 중복 없이 한 번씩 실행한다.
- Firebase emulator 테스트는 별도 명령으로 유지한다.
- CI는 `check`, `test`, `build`만 한 번씩 실행한다.
- 완료된 일회성 UI·라우트 고정 테스트 3개는 파일 자체를 제거한다.

### 제외: package alias만 제거

파일과 조합 명령 구조가 그대로 남아 관리 지점이 분산되고, CI 중복도 해결되지 않는다.

### 제외: 보안·Rules·핵심 동작까지 최소화

명령 수는 가장 적지만 인증, 결제, 소유권과 저장소 정책의 회귀를 build와 typecheck만으로
검출할 수 없어 운영 위험이 크다.

## 3. 공개 명령 계약

테스트 관련 package scripts는 다음 6개를 유지한다.

| 명령 | 역할 |
| --- | --- |
| `npm test` | emulator를 제외한 core, security, architecture suite 전체 실행 |
| `npm run test:security` | 인증·권한·결제·입력 안전성 관련 테스트만 실행 |
| `npm run test:architecture` | 저장소 경계·가드레일·문서 일관성 테스트만 실행 |
| `npm run test:emulator` | Firestore·Storage emulator 통합 테스트 실행 |
| `npm run test:all` | `check`, 기본 테스트, emulator 테스트, build 전체 실행 |
| `npm run validate:theme-extension` | 신규 테마 확장 전용 검증 실행 |

`npm test -- <suite-or-test-id>`를 지원한다. 예를 들어 `npm test -- security`는 보안 suite,
`npm test -- test-admin-api-auth`는 해당 테스트 하나만 실행한다. 인자가 없으면 `fast`를
기본값으로 사용한다.

## 4. suite 구성

### core

- `validate-theme-extension.mts`
- `test-admin-created-event-ownership.mts`
- `test-admin-customer-account-assignment-filters.mts`
- `test-admin-event-preview-links.mts`
- `test-admin-event-workspace-model.mts`
- `test-birthday-event-rendering.mts`
- `test-classic-r-theme.mts`
- `test-customer-page-wizard-save-route.mts`
- `test-customer-wallet-compensation.mts`
- `test-dummy-event-seeds.mts`
- `test-event-ownership-invite-policy.mts`
- `test-event-slug-index.mts`
- `test-first-birthday-page-rendering.mts`
- `test-image-upload-optimization.mts`
- `test-kakao-share-url-policy.mts`
- `test-opening-event-rendering.mts`
- `test-page-wizard-event-type-lock.mts`
- `test-page-wizard-schedule-time.mts`

### security

- `test-admin-api-auth.mts`
- `test-admin-owner-image-upload-routing.mts`
- `test-customer-api-auth.mts`
- `test-customer-auth-route-policy.mts`
- `test-editable-image-upload-validation.mts`
- `test-event-ownership-invite-routes.mts`
- `test-kakao-address-search-error-policy.mts`
- `test-kakao-map-infowindow-sanitization.mts`
- `test-mobile-customer-auth-policy.mts`
- `test-mobile-device-id-and-billing-policy.mts`
- `test-mobile-save-entitlement-policy.mts`
- `test-mobile-session-security-policy.mts`
- `test-public-access-block-reasons.mts`
- `test-rate-limit-policy.mts`
- `test-security-hardening.mts`

### architecture

- `test-api-repository-boundary.mts`
- `test-event-write-paths.mts`
- `test-project-guardrails.mts`
- `test-route-docs-consistency.mts`
- `test-service-repository-boundary.mts`

### emulator

- `test-billing-fulfillment-lock.mts`
- `test-event-ownership-invite-emulator.mts`
- `test-firestore-rules-emulator.mts`
- `test-storage-rules-emulator.mts`

`fast`는 core, security, architecture의 합집합이며 같은 파일을 두 번 실행하지 않는다.

## 5. 제거 범위

### 테스트 파일 삭제

- `scripts/test-event-input-box-sizing.mts`
  - 특정 CSS 문자열과 수치를 고정해 구현 변경에 취약한 일회성 UI 회귀 검사다.
- `scripts/test-first-birthday-hydration-stability.mts`
  - 수정 당시의 hook 구현 문자열을 고정하며 실제 hydration 동작을 실행하지 않는다.
- `scripts/test-page-editor-route-removal.mts`
  - 이미 제거된 route가 계속 없는지만 확인하는 tombstone 테스트다.

### package script 삭제

- 모든 개별 `test:*` 파일 실행 alias
- 동일 명령인 `test:event-ownership-invite-*`와 `test:ownership-invite-*` 중복 alias
- `build`와 동일한 `test:smoke`
- `test:regression`, `test:auth-hardening`, `test:api-resilience`
- `test:rules`, `test:storage-rules`, `test:rules:all`
- `test:stability:fast`, `test:stability:emulator`, `qa:stability`
- `qa:event-rollout`

개발·빌드·모바일·seed·배포 명령은 테스트 정리 범위가 아니므로 유지한다.

## 6. runner 동작

`scripts/run-test-suite.mjs`는 외부 의존성 없이 `node:child_process`로 각 테스트를 순차 실행한다.

- Windows에서는 `npx.cmd`, 그 외 환경에서는 `npx`를 사용한다.
- 각 파일은 기존과 같은 `npx --yes tsx --conditions react-server <file>` 계약으로 실행한다.
- 실행 전에 registry의 모든 파일이 존재하는지 확인한다.
- 알 수 없는 suite나 테스트 ID는 실행하지 않고 사용 가능한 값을 출력한 뒤 실패한다.
- `--list`는 suite와 테스트 ID를 실행 없이 출력한다.
- 테스트 하나가 실패하면 즉시 중단하고 파일명과 종료 코드를 출력한다.
- child process는 현재 working directory와 환경 변수를 그대로 사용해 emulator 변수를 보존한다.
- shell 문자열 조합을 사용하지 않고 실행 파일과 인자 배열을 분리한다.

## 7. CI와 문서 변경

GitHub Actions `verify` job은 다음 세 단계만 실행한다.

1. `npm run check`
2. `npm test`
3. `npm run build`

현재 CI가 별도로 실행하는 `test:security-hardening`, `test:project-guardrails`,
`test:regression`, `test:stability:fast`는 기본 suite에 포함되므로 제거한다. emulator suite는
현재 CI 정책과 동일하게 기본 CI에서 실행하지 않고 로컬 또는 별도 전체 검증에서 실행한다.

다음 문서의 기존 테스트 명령을 새 공개 명령으로 교체한다.

- `README.md`
- `docs/README.md`
- `docs/security-hardening-checklist.md`
- `docs/event-domain-current-state.md`
- `docs/api-repository-connection-checklist.md`
- `docs/service-repository-boundary.md`

`scripts/test-project-guardrails.mts`가 CI에서 기대하는 명령도 `npm run check`, `npm test`,
`npm run build`로 갱신한다.

## 8. 보존 기준

- 인증·권한·소유권·결제·rate limit·입력 검증 테스트는 구현 방식이 문자열 검사여도 현재
  대체 테스트가 없으면 유지한다.
- Firestore와 Storage Rules emulator 테스트는 실행 시간이 길어도 삭제하지 않는다.
- 활성 이벤트 타입과 테마의 렌더링·저장 정책 테스트는 유지한다.
- repository boundary와 project guardrail은 아키텍처 회귀 방지 역할이므로 유지한다.
- 개별 package alias를 제거해도 테스트 파일과 ID는 runner에서 직접 실행할 수 있다.

## 9. 검증

### runner 검증

- `node scripts/run-test-suite.mjs --list`
- `npm test -- test-admin-api-auth`
- `npm run test:security`
- `npm run test:architecture`
- `npm test`
- 존재하지 않는 ID가 비정상 종료되는지 확인

### 통합 검증

- `npm run check`
- `npm run build`
- Firebase와 Java 실행 환경이 준비된 경우 `npm run test:emulator`
- `package.json`, CI, README와 문서에 삭제된 명령 참조가 0건인지 검색
- 삭제한 테스트 파일 참조가 0건인지 검색
- `git diff --check`

## 10. 제외 범위

- 테스트 프레임워크 교체
- 현재 source-text 테스트를 실제 브라우저·API 통합 테스트로 전면 재작성
- Firebase emulator를 CI에 새로 추가
- 제품 코드 동작 변경
- 새 외부 의존성 추가
- 커밋, 푸시, 배포
