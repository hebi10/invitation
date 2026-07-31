# Documentation and Final QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 라우트·이벤트 타입·인증 경계를 핵심 문서에 반영하고, 안정화 작업 전체를 하나의 재현 가능한 검증 흐름으로 마무리한다.

**Architecture:** 현재 코드 문서는 `src/app`, `src/lib/eventTypes.ts`, `src/app/page-wizard/pageWizardEventConfig.ts`, 서버 인증·Repository 코드를 기준으로 갱신한다. 문서 회귀 검사는 현재 핵심 경로의 존재와 제거된 경로의 부재만 고정해 과도한 문자열 결합을 피한다.

**Tech Stack:** Markdown, TypeScript, Node.js `assert`, npm scripts, Next.js build, Expo lint/typecheck, 브라우저 수동 QA

## Global Constraints

- 코드에서 확인하지 못한 운영 상태를 문서에 단정하지 않는다.
- `/page-editor` UI가 없다는 사실과 `/api/client-editor/**` 호환 API가 남아 있다는 사실을 구분한다.
- 개업 생성 경로는 `/opening-wizard`로 기록한다.
- 커밋, 푸시, 배포를 수행하지 않는다.
- 브라우저 QA는 운영 데이터를 수정하지 않는 읽기·접근 차단 확인으로 제한한다.

---

### Task 1: 핵심 라우트 문서 회귀 검사

**Files:**
- Create: `scripts/test-route-docs-consistency.mts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `README.md`, 핵심 docs, `src/app` 디렉터리, `EVENT_TYPE_META`
- Produces: `test:route-docs-consistency`

- [ ] **Step 1: 현재 핵심 경로 assertions 작성**

```ts
for (const route of [
  '/admin',
  '/my-invitations',
  '/page-wizard',
  '/birthday-wizard',
  '/first-birthday-wizard',
  '/general-event-wizard',
  '/opening-wizard',
  '/memory/{slug}',
  '/{slug}',
  '/{slug}/{theme}',
]) {
  assert.ok(readme.includes(route), `README must document ${route}`);
}
assert.equal(
  readme.includes('/page-editor'),
  false,
  'README must not describe the removed page-editor UI as a current route.'
);
```

`docs/security-hardening-checklist.md`에도 현재 관리자·고객 경로가 있고
`/page-editor` 수동 QA 항목이 없는지 확인한다.

- [ ] **Step 2: 이벤트 타입 문서 assertions 작성**

`docs/event-type-registry.md`가 다음 활성 타입을 모두 포함하는지 확인한다.

```ts
for (const eventType of [
  'wedding',
  'first-birthday',
  'birthday',
  'general-event',
  'opening',
]) {
  assert.ok(registryDoc.includes(`\`${eventType}\``));
}
```

- [ ] **Step 3: 현재 문서 불일치로 실패 확인**

Run: `npx --yes tsx --conditions react-server scripts/test-route-docs-consistency.mts`

Expected: `/page-editor`, `/page-wizard/opening`, 누락 이벤트 타입 때문에 실패한다.

- [ ] **Step 4: package script 등록**

```json
"test:route-docs-consistency": "npx --yes tsx --conditions react-server scripts/test-route-docs-consistency.mts"
```

### Task 2: README와 서비스 개요 최신화

**Files:**
- Modify: `README.md`
- Modify: `docs/portfolio-service-overview.md`

**Interfaces:**
- Consumes: 실제 `src/app` 라우트와 `pageWizardEventConfig`
- Produces: 현재 사용자 흐름 설명

- [ ] **Step 1: 현재 라우트 표 갱신**

- `/page-editor`, `/page-editor/{slug}`를 현재 UI 라우트에서 제거한다.
- 결혼식 생성 `/page-wizard`
- 생일 생성 `/birthday-wizard`
- 돌잔치 생성 `/first-birthday-wizard`
- 일반 행사 생성 `/general-event-wizard`
- 개업 생성 `/opening-wizard`
- 기존 이벤트 편집 `/page-wizard/{slug}`
- 고객 대시보드 `/my-invitations`
- 고객 제작권 생성 `/my-invitations/create`

- [ ] **Step 2: 이벤트 타입과 렌더러 설명 갱신**

활성 타입을 `wedding`, `first-birthday`, `birthday`, `general-event`,
`opening`으로 기록하고 `seventieth`, `etc`는 비활성 준비 항목으로 구분한다.

- [ ] **Step 3: 고객·관리자 편집 흐름 갱신**

- 관리자는 `/admin`과 위저드 경로로 운영한다.
- 고객은 Firebase 계정과 `ownerUid` 연결을 기준으로 `/my-invitations`에서
  본인 이벤트를 관리한다.
- `/api/client-editor/**`는 UI 라우트가 아니라 호환성 확인 대상 API임을 현재
  아키텍처 주석에만 기록한다.

- [ ] **Step 4: 문서 검사 실행**

Run: `npm run test:route-docs-consistency`

Expected: README 관련 assertions가 성공한다.

### Task 3: 보안·Repository·이벤트 타입 문서 최신화

**Files:**
- Modify: `docs/security-hardening-checklist.md`
- Modify: `docs/service-repository-boundary.md`
- Modify: `docs/event-type-registry.md`
- Modify: `docs/ai-harness-handoff.md`

- [ ] **Step 1: 보안 체크리스트 갱신**

- `/page-editor` UI QA 항목 제거
- `/page-wizard/{slug}`의 관리자 또는 owner 권한 구분 명시
- 공통 `customerApiAuth`와 `adminApiAuth` 기준 추가
- Firestore·Storage Emulator 검사 명령 추가
- 링크 토큰은 서버 API와 고위험 재인증을 거친다고 기록

- [ ] **Step 2: Repository 경계 갱신**

- 웹 고객 API가 공통 고객 인증 Helper를 사용한다고 기록
- 결제 이행 잠금 결과와 동시 요청 차단 원칙 기록
- 레이트리밋 운영 fail-closed 실제 테스트 명령 기록
- Storage 이미지 byte 검증은 서버 업로드 경로, MIME·크기는 Rules가 담당함을
  구분

- [ ] **Step 3: 이벤트 타입 레지스트리 갱신**

`src/lib/eventTypes.ts`의 label, adminLabel, customerLabel, enabled,
renderer/editor/wizard key를 그대로 표에 반영한다. `first-birthday`와 `opening`
행을 추가하고 기존 birthday 설명을 일반 생일로 수정한다.

- [ ] **Step 4: 인수인계 문서를 이력으로 표시**

문서 첫 부분에 다음 의미를 명시한다.

```md
> 이 문서는 과거 작업 시점의 인수인계 기록입니다. 현재 라우트와 구현 판단은
> `README.md`, `docs/event-domain-current-state.md`, 실제 코드를 우선합니다.
```

과거 `/page-wizard/opening` 기록은 현재 경로가 `/opening-wizard`임을 바로 아래에
정정한다.

- [ ] **Step 5: 문서 회귀 검사**

Run: `npm run test:route-docs-consistency`

Expected: `route documentation consistency checks passed`

### Task 4: 전체 안정화 검증 스크립트

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: 인증, API·Repository, Rules, 문서 테스트
- Produces: `test:stability:fast`
- Produces: `qa:stability`

- [ ] **Step 1: 빠른 안정화 스크립트 추가**

Emulator가 필요하지 않은 검사를 묶는다.

```json
"test:stability:fast": "npm run test:auth-hardening && npm run test:api-repository-boundary && npm run test:service-repository-boundary && npm run test:event-write-paths && npm run test:rate-limit-policy && npm run test:customer-wallet-compensation && npm run test:editable-image-upload-validation && npm run test:route-docs-consistency"
```

- [ ] **Step 2: 로컬 전체 통합 스크립트 추가**

```json
"qa:stability": "npm run test:stability:fast && npm run test:billing-fulfillment-lock && npm run test:rules:all && npm run check"
```

- [ ] **Step 3: 빠른 검사 실행**

Run: `npm run test:stability:fast`

Expected: Emulator 없이 모든 검사가 성공한다.

- [ ] **Step 4: 기존 CI에 빠른 검사 추가**

기존 `Regression tests` 다음에 아래 단계를 추가한다.

```yaml
- name: Stability fast checks
  run: npm run test:stability:fast
```

Emulator 검사는 CI 환경 구성과 실행시간을 별도로 검토하기 전까지
`qa:stability`와 배포 전 검증에서 실행한다.

- [ ] **Step 5: CI 파일 정책 검사**

Run: `npm run test:project-guardrails`

Expected: CI 필수 명령과 프로젝트 경계가 모두 유지된다.

### Task 5: 정적·빌드·모바일 영향 최종 검증

**Files:**
- No code changes

- [ ] **Step 1: 웹 정적 검증**

Run: `npm run lint:web`

Run: `npm run typecheck:web`

Expected: 두 명령이 성공한다.

- [ ] **Step 2: 모바일 계약 영향 검증**

Run: `npm run lint:mobile`

Run: `npm run typecheck:mobile`

Expected: 모바일 코드 수정 없이 두 명령이 성공한다.

- [ ] **Step 3: 전체 회귀 검증**

Run: `npm run test:regression`

Run: `npm run qa:stability`

Expected: 모든 회귀와 안정화 검사가 성공한다.

- [ ] **Step 4: 웹 빌드**

Run: `npm run build`

Expected: Next.js production build가 성공한다. Firebase 자격증명 부재로 metadata
동기화가 실패하면 코드 실패와 환경 실패를 구분하고, `.env`나 운영 비밀값을
변경하지 않는다.

### Task 6: 브라우저 수동 QA

**Files:**
- No code changes

- [ ] **Step 1: 로컬 서버 실행**

Run: `npm run dev`

Expected: Next.js 개발 서버가 오류 없이 시작된다.

- [ ] **Step 2: 공개 화면 확인**

- `/` 진입
- 공개 sample slug의 `/{slug}`
- 지원 theme의 `/{slug}/{theme}`
- 네트워크와 콘솔에 인증 정보 또는 내부 오류가 노출되지 않는지 확인

- [ ] **Step 3: 비로그인 접근 차단 확인**

- `/admin`
- `/page-wizard`
- `/my-invitations`

각 화면이 현재 UX에 맞는 로그인 또는 권한 안내를 표시하고 민감 데이터를
렌더링하지 않는지 확인한다.

- [ ] **Step 4: 이벤트별 생성 진입 확인**

- `/birthday-wizard`
- `/first-birthday-wizard`
- `/general-event-wizard`
- `/opening-wizard`

이벤트별 문구와 테마 선택지가 다른 타입으로 섞이지 않는지 읽기 전용으로
확인한다. 저장 버튼은 운영 데이터 연결 여부가 불명확하면 실행하지 않는다.

- [ ] **Step 5: 서버 종료 및 QA 기록**

개발 서버를 종료하고 확인한 URL, 성공·실패 결과, 인증 자격증명 부재로 확인하지
못한 항목을 완료 보고에 기록한다.

### Task 7: 완료 보고

**Files:**
- No code changes

- [ ] **Step 1: 변경 요약 작성**

- 인증 오류 정규화
- Repository 및 레이트리밋 경계
- 제작권 보상과 결제 잠금
- Firestore·Storage Rules
- 문서 최신화

- [ ] **Step 2: 검증 결과 작성**

실행한 명령별 성공·실패와 소요 시간을 기록한다. 실패는 기존 오류, 환경 오류,
이번 변경 오류로 구분한다.

- [ ] **Step 3: 남은 위험 작성**

- 운영 Secret Manager와 App Hosting 상태
- 실제 RevenueCat·Google Play 검증
- 인증 계정이 필요한 관리자·고객 화면
- Storage Rules가 파일 byte 내용을 검사할 수 없어 서버 이미지 검증에 의존하는
  부분

- [ ] **Step 4: Git·배포 상태 명시**

커밋, 푸시, 배포를 수행하지 않았음을 보고한다.
