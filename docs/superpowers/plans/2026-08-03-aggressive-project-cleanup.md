# 공격형 프로젝트 정리 실행 계획

**목표:** 현재 웹·모바일 실행 경로를 보존하면서 재생성 산출물, 과거 문서, 미참조
스크립트·리소스·코드, 불필요한 의존성을 증거 기반으로 제거한다.

**방식:** 기준선 확보 → 삭제 manifest 승인 → 문서 → 스크립트 → 리소스 → 코드·의존성 →
통합 검증 → 로컬 캐시 순으로 진행한다. 각 묶음은 독립 검증하며 모바일 기능 개선은 후속
작업으로 분리한다.

**기술 스택:** Next.js 15 App Router, React 19, TypeScript, Expo, Firebase, ESLint,
PowerShell, npm

## 공통 제약

- 실제 삭제 전 정확한 대상과 근거를 해비님께 제시하고 승인을 받는다.
- 운영 데이터, Firebase 운영 환경, 배포 설정 변경, 커밋, 푸시, 배포를 하지 않는다.
- `package-lock.json`은 삭제하지 않는다.
- 동적 route, registry, Expo 설정, Firebase 설정을 정적 import와 함께 검사한다.
- 정리와 모바일 구조 개선을 한 변경 묶음에 섞지 않는다.
- 사용자 변경이 발견되면 덮어쓰지 않고 해당 파일을 정리 대상에서 제외한다.

---

## Task 1: 정리 전 기준선과 삭제 manifest 확정

**Files:**
- Reference: `package.json`
- Reference: `apps/mobile/package.json`
- Reference: `.gitignore`
- Reference: `next.config.ts`
- Reference: `apps/mobile/app.config.ts`
- Create during execution: 사용자 보고용 삭제 manifest(대화에 제시하며 저장 파일은 만들지 않음)

- [ ] **Step 1: Git 및 로컬 파일 기준선 기록**

```powershell
git status --short
git ls-files
git clean -nd
git clean -ndX
```

예상 결과: 사용자 변경 여부와 추적·미추적·무시 파일이 구분된다. `git clean`은 반드시
`-n`으로만 실행하며 실제 삭제에는 사용하지 않는다.

- [ ] **Step 2: 정리 전 용량과 파일 수 기록**

루트, `src`, `public`, `docs`, `scripts`, `apps/mobile`, `.next`, 각 `node_modules`의 파일 수와
용량을 읽기 전용으로 집계한다. reparse point가 있는지 확인하고 있으면 재귀 삭제 대상에서
제외한다.

- [ ] **Step 3: 정리 전 자동 검증 실행**

```powershell
npm run test:project-guardrails
npm run test:route-docs-consistency
npm run typecheck:web
npm run lint:web
npm run typecheck:mobile
npm run lint:mobile
npm run build
```

각 명령의 성공·실패와 기존 오류를 기록한다. build가 `.next`, `src/generated`,
`next-env.d.ts`를 다시 만드는 것도 확인한다.

- [ ] **Step 4: 삭제 manifest 작성 및 승인 받기**

각 항목에 `경로 / 분류 / 삭제 근거 / 참조 확인 / 복구 또는 재생성 방법 / 예상 절감 용량`을
기록한다. `확정 삭제`, `설정 통합 후 삭제`, `보존` 세 그룹으로 나누고 승인 전에는 삭제하지
않는다.

---

## Task 2: 과거 문서와 끊어진 문서 계약 정리

**Files:**
- Review: `README.md`
- Review: `docs/README.md`
- Review: `docs/**/*.md`
- Review: `scripts/test-route-docs-consistency.mts`
- Review: `scripts/validate-theme-extension.mts`

- [ ] **Step 1: 문서 인바운드 참조와 현재성 분류**

README, package scripts, 검증 스크립트, 소스 주석에서 각 문서명을 검색한다. 문서가 설명하는
route, API, 저장 schema가 현재 코드와 일치하는지 확인한다.

- [ ] **Step 2: 제거 후보 확정**

우선 후보는 완료된 `docs/superpowers/plans`, 과거 `docs/superpowers/specs`, 오래된 수동 QA
결과, 대체된 인수인계·제안서다. 현재 동작의 유일한 설명이면 핵심 내용을 현행 문서에 통합한
후 후보에 넣는다.

- [ ] **Step 3: 승인된 문서와 연결 링크 정리**

승인된 파일을 제거하고 `README.md`, `docs/README.md`, 관련 검증 스크립트의 링크와 기대값을
현재 문서 집합에 맞춘다. 이번 정리 설계와 실행 계획은 실행 완료 보고 전까지 유지한다.

- [ ] **Step 4: 문서 검증**

```powershell
npm run test:route-docs-consistency
npm run test:project-guardrails
```

예상 결과: PASS, 존재하지 않는 문서 링크 0건, 코드와 다른 route 계약 0건.

---

## Task 3: 미참조 스크립트와 명령 정리

**Files:**
- Review/Delete candidate: `scripts/seed-invitation-pages.mjs`
- Review/Delete candidate: `scripts/test-firebase-auth-error-message.mts`
- Review/Modify: `package.json`
- Review: `.github/**/*`
- Review: `README.md`

- [ ] **Step 1: 모든 스크립트의 실행 진입점 조사**

package scripts, GitHub Actions, 문서, 다른 스크립트 import와 Git 이력을 검색한다. 파일명으로
호출하지 않는 helper import도 별도로 확인한다.

- [ ] **Step 2: 1차 후보의 수동 운영 용도 확인**

`seed-invitation-pages.mjs`가 현재 events schema나 운영 절차에서 여전히 필요한지 확인한다.
`test-firebase-auth-error-message.mts`가 현재 오류 정책 검증으로 대체되었는지 확인한다.

- [ ] **Step 3: 승인된 스크립트와 고아 package script 제거**

삭제 파일을 호출하는 package script가 있으면 함께 제거한다. 현재 package script가 사용하는
테스트 파일은 단순히 개수가 많다는 이유로 삭제하지 않는다.

- [ ] **Step 4: 관련 검증**

```powershell
npm run test:project-guardrails
npm run test:regression
```

예상 결과: PASS, package script가 존재하지 않는 파일을 호출하는 사례 0건.

---

## Task 4: 웹·모바일 이미지와 아이콘 통합

**Files:**
- Delete candidate: `public/codex-app-icon.png`
- Delete candidate: `apps/mobile/assets/favicon.ico`
- Consolidate candidate: `public/images/favicon.ico`
- Keep canonical candidate: `public/favicon.ico`
- Delete candidate: `public/images/thum.jpg`
- Keep: `apps/mobile/assets/splash.jpg`
- Consolidate candidate: `apps/mobile/assets/adaptive-icon.png`
- Keep canonical candidate: `apps/mobile/assets/icon.png`
- Modify if consolidated: `src/config/pages/*.ts`
- Modify if consolidated: `apps/mobile/app.config.ts`

- [ ] **Step 1: 참조와 해시 재확인**

코드·메타데이터·Expo config·배포 설정의 정적 및 문자열 참조를 검색하고 파일 해시를 비교한다.
외부 서비스가 URL로 참조할 수 있는 `public` 파일은 운영 배포 이력도 확인한다.

- [ ] **Step 2: canonical 경로 결정**

웹 favicon은 `/favicon.ico`를 우선 canonical로 하고 현재 `/images/favicon.ico` 설정을 통합할 수
있는지 확인한다. 모바일 adaptive icon은 `app.config.ts`에서 `icon.png`를 함께 사용해도
플랫폼 요구사항과 렌더링이 유지되는 경우에만 사본을 제거한다.

- [ ] **Step 3: 설정 변경 후 중복·미참조 파일 제거**

`codex-app-icon.png`, 모바일 미참조 favicon, 웹 미참조 thumbnail을 최종 확인한 뒤 승인된
파일을 제거한다. Expo splash처럼 현재 설정이 직접 참조하는 파일은 보존한다.

- [ ] **Step 4: 웹·모바일 검증**

```powershell
npm run typecheck:web
npm run lint:web
npm run typecheck:mobile
npm run lint:mobile
npm run build
```

브라우저에서 favicon, 공개 초대장 metadata를 확인하고 모바일에서 앱 아이콘 설정, splash,
adaptive icon 경로 오류가 없는지 확인한다.

---

## Task 5: 도달 불가능한 소스 코드 제거

**Files:**
- Review: `src/**/*.{ts,tsx}`
- Review: `apps/mobile/src/**/*.{ts,tsx}`
- Review: `src/config/**/*`
- Review: Next.js 및 Expo route 파일

- [ ] **Step 1: 실행 진입점 정의**

Next.js `page`, `layout`, `route`, middleware, config, package scripts와 Expo Router route,
`app.config.ts`를 root로 정의한다. 테스트와 seed 명령은 별도 진입점으로 표시한다.

- [ ] **Step 2: import graph와 문자열 registry 조사**

TypeScript compiler API 또는 기존 설치 도구를 사용해 상대경로·alias import graph를 만든다.
`dynamic import`, 테마 renderer registry, 이벤트 타입 registry, slug 기반 config lookup을 `rg`로
보완한다. 새 영구 의존성은 추가하지 않는다.

- [ ] **Step 3: 삭제 후보별 역참조 증거 확보**

어떤 진입점에서도 도달하지 않는 파일만 후보로 둔다. route 자체, Firebase 규칙과 연결되는
계약, 공개 export, 테스트 fixture는 0개 import만으로 삭제하지 않는다.

- [ ] **Step 4: 작은 묶음으로 승인 및 제거**

웹 UI, 서버/API, 서비스·저장소, 모바일 순으로 묶음을 나눈다. 한 묶음이 공통 기능과 같은
파일을 수정하면 병렬화하지 않는다. 빈 디렉터리는 내부 파일이 모두 승인되어 제거된 뒤에만
정리한다.

- [ ] **Step 5: 묶음별 검증**

```powershell
npm run typecheck:web
npm run lint:web
npm run typecheck:mobile
npm run lint:mobile
npm run test:regression
```

서버/API 관련 파일을 제거한 묶음은 관련 auth, repository, rules 테스트도 추가 실행한다.

---

## Task 6: 미사용 의존성과 설정 정리

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify if needed: `apps/mobile/package.json`
- Modify if needed: `apps/mobile/package-lock.json`
- Review: `eslint.config.mjs`
- Review: `next.config.ts`
- Review: `apps/mobile/metro.config.js`
- Review: `apps/mobile/app.config.ts`

- [ ] **Step 1: 의존성 사용 근거 수집**

각 dependency와 devDependency를 코드 import, config plugin, CLI package script, ESLint config,
Firebase/Expo/Next build 사용으로 분류한다. 자동 도구 결과만으로 삭제하지 않는다.

- [ ] **Step 2: 웹과 모바일을 별도 묶음으로 제거**

근거가 없는 의존성만 기존 npm으로 제거해 manifest와 lock 파일을 함께 갱신한다. package
manager나 lock 파일 형식을 바꾸지 않는다.

- [ ] **Step 3: 깨끗한 설치 가능성 확인**

현재 설치본을 바로 삭제하지 않고 lock 파일과 `npm install --package-lock-only --ignore-scripts`
등 비파괴 검사를 우선한다. 실제 `node_modules` 재설치 검증이 필요하면 별도 승인 후 진행한다.

- [ ] **Step 4: 전체 자동 검증**

```powershell
npm run check
npm run test:regression
npm run build
```

필요 시 Firebase emulator 테스트를 실행하고 모바일 Expo config 해석도 확인한다.

---

## Task 7: 핵심 사용자 흐름 QA와 최종 캐시 정리

**Files:**
- Remove after final approval: `.next/`
- Remove after final approval: `apps/mobile/.expo/`
- Remove after final approval: `src/generated/`
- Remove after final approval: `firestore-debug.log`
- Remove after final approval: `next-env.d.ts`
- Optional remove after separate approval: `node_modules/`
- Optional remove after separate approval: `apps/mobile/node_modules/`

- [ ] **Step 1: 웹 브라우저 QA**

관리자 로그인·페이지 목록·고객 연결 링크, 고객 로그인·연결·페이지 위저드 저장, 공개 초대장
렌더링과 metadata를 확인한다. 데스크톱과 모바일 폭을 모두 확인한다.

- [ ] **Step 2: 모바일 QA**

모바일 로그인, 초대장 생성, 관리, 이미지 업로드 주요 흐름과 Expo 설정 로딩을 확인한다.
발견한 구조 개선 사항은 삭제 작업에 섞지 않고 후속 개선 목록으로 기록한다.

- [ ] **Step 3: 최종 삭제 대상 경로 검증**

각 경로를 절대 경로로 해석하고 작업공간 내부인지, 기대한 파일·디렉터리 유형인지,
reparse point가 아닌지 확인한다. 대상 수와 크기를 출력한 뒤 승인된 정확한 경로만 제거한다.

- [ ] **Step 4: 재생성 캐시 제거**

`.next`, `.expo`, generated metadata, debug log, generated Next type 파일을 제거한다.
`node_modules` 두 곳은 개발을 바로 계속할 경우 유지하고, 디스크 회수가 목적일 때만 별도
승인 후 제거한다.

- [ ] **Step 5: 최종 상태 보고**

```powershell
git status --short
git diff --stat
git diff --name-status
git clean -nd
git clean -ndX
```

삭제·수정 파일, 정리 전후 파일 수와 용량, 검증 결과, 기존 오류, 수동 QA 결과, 남은 모바일
개선 후보를 보고한다. 커밋, 푸시, 배포는 하지 않는다.

