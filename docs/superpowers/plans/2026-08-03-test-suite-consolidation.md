# Test Suite Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 핵심 테스트 보호 범위를 유지하면서 테스트 실행 목록을 단일 runner로 통합하고 `package.json`의 테스트·QA 명령을 6개로 줄인다.

**Architecture:** `scripts/run-test-suite.mjs`가 core, security, architecture, emulator registry를 소유하고 테스트를 순차 실행한다. `package.json`과 CI는 역할 중심 명령만 노출하며 README와 운영 문서는 새 명령 계약을 사용한다. 과거 구현 문자열만 고정하는 테스트 3개는 삭제한다.

**Tech Stack:** Node.js 20+, npm, TypeScript, tsx, Firebase Emulator, GitHub Actions

## Global Constraints

- 외부 의존성을 추가하지 않는다.
- 제품 코드 동작을 변경하지 않는다.
- 인증·권한·소유권·결제·rate limit·입력 검증 테스트를 유지한다.
- Firestore와 Storage Rules emulator 테스트를 유지한다.
- 활성 이벤트 타입과 테마 테스트를 유지한다.
- repository boundary와 project guardrail 테스트를 유지한다.
- 테스트 파일은 `npx --yes tsx --conditions react-server <file>` 계약으로 실행한다.
- emulator 테스트는 기본 CI에 새로 추가하지 않는다.
- 사용자 변경을 덮어쓰지 않는다.
- 커밋, 푸시, 배포를 하지 않는다.

---

### Task 1: suite runner 추가

**Files:**
- Create: `scripts/run-test-suite.mjs`
- Reference: `docs/superpowers/specs/2026-08-03-test-suite-consolidation-design.md`

**Interfaces:**
- Produces: `node scripts/run-test-suite.mjs [fast|core|security|architecture|emulator|<test-id>|--list]`.
- Produces: 기본 인자가 없을 때 `fast` suite 실행.
- Consumes: 현재 working directory, environment variables, `npx` executable.

- [ ] **Step 1: runner가 아직 없음을 확인해 RED 기록**

Run:

```powershell
node scripts/run-test-suite.mjs --list
```

Expected: FAIL with `MODULE_NOT_FOUND` because the runner does not exist.

- [ ] **Step 2: suite registry와 실행기를 작성**

`scripts/run-test-suite.mjs`에 다음 구조를 구현한다.

```js
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CORE_TESTS = [
  'validate-theme-extension',
  'test-admin-created-event-ownership',
  'test-admin-customer-account-assignment-filters',
  'test-admin-event-preview-links',
  'test-admin-event-workspace-model',
  'test-birthday-event-rendering',
  'test-classic-r-theme',
  'test-customer-page-wizard-save-route',
  'test-customer-wallet-compensation',
  'test-dummy-event-seeds',
  'test-event-ownership-invite-policy',
  'test-event-slug-index',
  'test-first-birthday-page-rendering',
  'test-image-upload-optimization',
  'test-kakao-share-url-policy',
  'test-opening-event-rendering',
  'test-page-wizard-event-type-lock',
  'test-page-wizard-schedule-time',
];

const SECURITY_TESTS = [
  'test-admin-api-auth',
  'test-admin-owner-image-upload-routing',
  'test-customer-api-auth',
  'test-customer-auth-route-policy',
  'test-editable-image-upload-validation',
  'test-event-ownership-invite-routes',
  'test-kakao-address-search-error-policy',
  'test-kakao-map-infowindow-sanitization',
  'test-mobile-customer-auth-policy',
  'test-mobile-device-id-and-billing-policy',
  'test-mobile-save-entitlement-policy',
  'test-mobile-session-security-policy',
  'test-public-access-block-reasons',
  'test-rate-limit-policy',
  'test-security-hardening',
];

const ARCHITECTURE_TESTS = [
  'test-api-repository-boundary',
  'test-event-write-paths',
  'test-project-guardrails',
  'test-route-docs-consistency',
  'test-service-repository-boundary',
];

const EMULATOR_TESTS = [
  'test-billing-fulfillment-lock',
  'test-event-ownership-invite-emulator',
  'test-firestore-rules-emulator',
  'test-storage-rules-emulator',
];

const SUITES = {
  core: CORE_TESTS,
  security: SECURITY_TESTS,
  architecture: ARCHITECTURE_TESTS,
  emulator: EMULATOR_TESTS,
  fast: [...new Set([...CORE_TESTS, ...SECURITY_TESTS, ...ARCHITECTURE_TESTS])],
};
```

각 ID를 `scripts/${id}.mts`로 해석한다. 시작할 때 registry 전체의 파일 존재 여부와 suite 내
중복을 확인한다. `--list`는 suite별 ID를 출력하고 종료한다. 알 수 없는 인자는 오류와 가능한
suite·ID를 출력하고 `process.exitCode = 1`로 종료한다.

테스트 실행은 다음 계약을 사용한다.

```js
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  executable,
  ['--yes', 'tsx', '--conditions', 'react-server', filePath],
  { cwd: process.cwd(), env: process.env, stdio: 'inherit', shell: false }
);
```

`result.error`가 있으면 throw하고, `result.status !== 0`이면 현재 ID와 종료 코드를 출력한 뒤
같은 코드로 중단한다.

- [ ] **Step 3: 목록과 오류 경로 검증**

Run:

```powershell
node scripts/run-test-suite.mjs --list
node scripts/run-test-suite.mjs does-not-exist
```

Expected: `--list` PASS and prints five suites; unknown ID exits non-zero without running a test.

- [ ] **Step 4: 단일 테스트와 작은 suite 검증**

Run:

```powershell
node scripts/run-test-suite.mjs test-admin-api-auth
node scripts/run-test-suite.mjs architecture
```

Expected: selected tests PASS exactly once and runner prints the current ID before execution.

---

### Task 2: package scripts와 CI를 역할 중심으로 축소

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/test-project-guardrails.mts`

**Interfaces:**
- Consumes: `scripts/run-test-suite.mjs` CLI from Task 1.
- Produces: `test`, `test:security`, `test:architecture`, `test:emulator`, `test:all`, `validate:theme-extension` public commands.

- [ ] **Step 1: CI 가드레일 기대값을 먼저 바꿔 RED 확인**

`scripts/test-project-guardrails.mts`의 CI expected list를 다음으로 바꾼다.

```ts
for (const expected of [
  'npm ci',
  'npm run check',
  'npm test',
  'npm run build',
]) {
```

Run:

```powershell
npx --yes tsx --conditions react-server scripts/test-project-guardrails.mts
```

Expected: FAIL because `.github/workflows/ci.yml` does not yet contain `npm test` and `npm run build`.

- [ ] **Step 2: package scripts를 새 공개 계약으로 교체**

기존 개발·모바일·build·seed·deploy 명령은 유지한다. 모든 개별 테스트 alias와 중첩
`test:*`·`qa:*` 조합을 제거하고 다음 항목만 추가한다.

```json
{
  "validate:theme-extension": "node scripts/run-test-suite.mjs validate-theme-extension",
  "test": "node scripts/run-test-suite.mjs",
  "test:security": "node scripts/run-test-suite.mjs security",
  "test:architecture": "node scripts/run-test-suite.mjs architecture",
  "test:emulator": "firebase emulators:exec --project demo-invitation-rules --only firestore,storage \"node scripts/run-test-suite.mjs emulator\"",
  "test:all": "npm run check && npm test && npm run test:emulator && npm run build"
}
```

`build`, `build:memory-metadata-strict`, `start`, `preview`, `check`는 그대로 보존한다.

- [ ] **Step 3: CI의 중복 테스트 단계를 세 단계로 교체**

`.github/workflows/ci.yml`의 검증 명령을 다음 순서로 둔다.

```yaml
- name: Lint and typecheck
  run: npm run check

- name: Tests
  run: npm test

- name: Build
  run: npm run build
```

기존 `Security hardening`, `Project guardrails`, `Regression tests`, `Stability fast checks` 단계는
삭제한다.

- [ ] **Step 4: CI 가드레일 GREEN 확인**

Run:

```powershell
node scripts/run-test-suite.mjs test-project-guardrails
```

Expected: PASS and CI contains each required command exactly once.

- [ ] **Step 5: package script 계약 검사**

PowerShell로 `package.json`을 파싱해 다음을 확인한다.

- 테스트 관련 공개 명령이 여섯 개다.
- `test:smoke`, `test:regression`, `test:stability:fast`, `qa:stability`가 없다.
- `test:event-ownership-invite-policy`, `test:ownership-invite-policy` 중복 alias가 없다.
- `build`, `check`, `seed:dummy-events`, deploy 명령이 남아 있다.

---

### Task 3: 일회성 테스트 삭제와 문서 명령 갱신

**Files:**
- Delete: `scripts/test-event-input-box-sizing.mts`
- Delete: `scripts/test-first-birthday-hydration-stability.mts`
- Delete: `scripts/test-page-editor-route-removal.mts`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/security-hardening-checklist.md`
- Modify: `docs/event-domain-current-state.md`
- Modify: `docs/api-repository-connection-checklist.md`
- Modify: `docs/service-repository-boundary.md`

**Interfaces:**
- Consumes: Task 2의 여섯 공개 명령.
- Produces: 삭제된 명령·파일 참조가 없는 현재 문서.

- [ ] **Step 1: 삭제 대상 역참조를 확인**

Run:

```powershell
rg -n "test:event-input-box-sizing|test:first-birthday-hydration-stability|test:page-editor-route-removal|test-event-input-box-sizing|test-first-birthday-hydration-stability|test-page-editor-route-removal" . --glob '!node_modules/**' --glob '!.next/**' --glob '!apps/mobile/node_modules/**'
```

Expected: only `package.json`, runner registry if accidentally included, design/plan documents, and the three files themselves may match. Runner registry must not contain the three IDs.

- [ ] **Step 2: 테스트 파일 3개 삭제**

정확한 세 경로만 제거한다. 삭제 후 `Test-Path`와 `rg`로 실행 참조가 남지 않았는지 확인한다.

- [ ] **Step 3: README 테스트 명령 갱신**

`README.md`와 `docs/README.md`의 `test:smoke`, `qa:event-rollout`, `test:stability:fast`,
`qa:stability` 안내를 다음 계약으로 교체한다.

```powershell
npm test
npm run test:security
npm run test:architecture
npm run test:emulator
npm run test:all
```

문맥상 빠른 검증은 `npm test`, build 확인은 `npm run build`, emulator 포함 전체 검증은
`npm run test:all`을 사용한다.

- [ ] **Step 4: 운영·아키텍처 문서 명령 갱신**

- `docs/security-hardening-checklist.md`: 개별 auth·rate-limit 명령을 `test:security`, rules 명령을
  `test:emulator`, 전체 명령을 `test:all`로 교체.
- `docs/event-domain-current-state.md`: `qa:event-rollout`과 개별 repository 명령을
  `test:architecture`로 교체.
- `docs/api-repository-connection-checklist.md`: 개별 boundary 명령을 `test:architecture`로 교체.
- `docs/service-repository-boundary.md`: 개별 repository·auth·rules 명령 목록을
  `test:architecture`, `test:security`, `test:emulator`로 교체.

- [ ] **Step 5: 삭제된 명령과 파일 참조 0건 확인**

`rg`로 기존 package script 이름과 세 삭제 파일명을 검색한다. 현재 설계·실행 계획 문서는
변경 이력을 설명하므로 검색 결과에서 제외한다. README, 운영 문서, CI, 코드의 결과는 0건이어야
한다.

---

### Task 4: 전체 검증과 최종 상태 확인

**Files:**
- Verify: `scripts/run-test-suite.mjs`
- Verify: `package.json`
- Verify: `.github/workflows/ci.yml`
- Verify: modified documentation

**Interfaces:**
- Consumes: Tasks 1-3의 최종 tree.
- Produces: 통합 suite와 문서 계약이 일치하는 검증 증거.

- [ ] **Step 1: runner 선택 실행 검증**

Run:

```powershell
node scripts/run-test-suite.mjs --list
npm test -- test-admin-api-auth
npm run test:security
npm run test:architecture
```

Expected: all PASS; 단일 실행은 한 파일만 실행한다.

- [ ] **Step 2: 기본 전체 테스트 실행**

Run:

```powershell
npm test
```

Expected: core, security, architecture의 모든 등록 파일이 한 번씩 PASS.

- [ ] **Step 3: 정적 검증과 build 실행**

Run:

```powershell
npm run check
npm run build
```

Expected: web/mobile lint와 typecheck, Next production build PASS.

- [ ] **Step 4: emulator 실행 가능성 확인**

Java와 Firebase CLI가 준비되어 있으면 실행한다.

```powershell
npm run test:emulator
```

Expected: billing lock, ownership invite, Firestore Rules, Storage Rules PASS. 환경 미준비로 실행하지
못하면 Java/Firebase 상태와 미검증 범위를 최종 보고에 남긴다.

- [ ] **Step 5: 문서·Git 최종 검사**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

삭제 파일 3개, 신규 runner, package/CI/문서 변경만 이번 작업 범위에 포함되어야 한다. 기존
`docs/superpowers/plans/2026-08-03-admin-operations-console-redesign.md`는 사용자 변경이므로
수정하지 않는다. 커밋, 푸시, 배포는 하지 않는다.
