# 공격형 프로젝트 정리 설계

## 1. 목적

현재 웹과 모바일 제품의 실제 실행 경로는 보존하면서, Git으로 복구 가능한 과거 작업물과
재생성 가능한 산출물, 참조되지 않는 코드·스크립트·리소스·의존성을 제거한다.

모바일 앱은 삭제 대상이 아니라 유지·개선 대상이다. 이번 정리에서는 모바일 실행에 필요한
소스와 설정을 보존하고, 정리 완료 후 별도의 모바일 구조 개선 작업으로 넘긴다.

## 2. 채택한 접근법

### 채택: 증거 기반 공격형 정리

- 캐시와 빌드 산출물은 정확한 경로를 확인한 뒤 제거한다.
- 완료된 일회성 계획서와 인수인계 문서는 현재 코드 및 운영 문서가 대체하는 경우 제거한다.
- 소스 파일은 크기나 수정일이 아니라 실행 진입점에서의 도달 가능성과 실제 참조를 기준으로 제거한다.
- 중복 리소스는 플랫폼 설정이 요구하는 경로를 통합한 뒤 중복 파일을 제거한다.
- 의존성은 import, 설정, CLI 사용 여부를 모두 확인하고 웹·모바일 검증을 통과한 경우에만 제거한다.
- 삭제는 성격별 묶음으로 나누고 각 묶음마다 검증해 회귀 원인을 분리한다.

### 제외: 생성물만 지우는 보수형 정리

안전하지만 과거 문서, 미사용 자산, 도달 불가능한 코드와 불필요한 의존성이 계속 남으므로
이번 목표를 충족하지 못한다.

### 제외: 기능 단위 일괄 삭제

현재 UI에서 잘 보이지 않는다는 이유만으로 라우트나 도메인 기능 전체를 삭제하면 관리자,
고객, 모바일, Firebase 경계에 숨은 회귀가 생길 수 있다. 제품 기능 제거는 별도 요구사항으로
다루고 이번 작업은 현재 실행 경로에서 쓰이지 않는 항목에 한정한다.

## 3. 현재 확인된 구조와 후보

### 재생성 가능한 로컬 산출물

- `.next/`
- `apps/mobile/.expo/`
- `src/generated/`
- `firestore-debug.log`
- `next-env.d.ts`
- 루트와 모바일의 `node_modules/`

현재 로컬 용량의 약 1.2GB가 위 캐시와 설치 의존성에 집중되어 있다. `node_modules`는
개발 검증에 필요하고 삭제 후 다시 설치되므로 최종 디스크 정리가 필요할 때만 마지막에 제거한다.

### 참조가 확인되지 않은 1차 후보

- `public/codex-app-icon.png`
- `scripts/seed-invitation-pages.mjs`
- `scripts/test-firebase-auth-error-message.mts`
- `apps/mobile/assets/favicon.ico`

파일명 정적 검색 결과를 기반으로 한 후보이므로, 삭제 전 설정·동적 참조·Git 이력을 다시 확인한다.

### 중복 리소스 후보

- `public/favicon.ico`와 `public/images/favicon.ico`
- `public/images/thum.jpg`와 `apps/mobile/assets/splash.jpg`
- `apps/mobile/assets/icon.png`와 `apps/mobile/assets/adaptive-icon.png`

같은 내용이어도 현재 경로 계약이 다르면 유지한다. 예를 들어 모바일 splash는 Expo 설정에서
직접 사용되므로 웹의 미참조 사본만 제거할 수 있다. favicon과 모바일 아이콘은 설정을 단일
경로로 바꾸고 검증한 경우에만 사본을 제거한다.

### 보호 대상

- `apps/mobile/src`, `apps/mobile/app.config.ts`, `apps/mobile/eas.json` 등 모바일 실행 소스와 설정
- 루트와 모바일의 `package-lock.json`
- Firebase Rules, indexes, hosting 설정과 환경 변수 예시
- README 또는 검증 스크립트에서 계약으로 사용하는 문서
- Next.js 라우트, API route, 동적 테마·이벤트 registry에서 도달 가능한 코드
- 운영 데이터와 배포 환경

## 4. 문서 정리 기준

문서는 용량보다 정확성과 현재성으로 판단한다.

- 유지: 현재 아키텍처, 보안 정책, 이벤트 registry, 테마 확장 절차, 모바일 연동 기준처럼
  코드 또는 검증 스크립트가 계약으로 사용하는 문서.
- 통합 후 제거: README와 여러 문서에 같은 설명이 반복되고 한 문서로 충분한 경우.
- 제거: 완료된 일회성 구현 계획, 오래된 수동 QA 결과, 현재 코드와 맞지 않는 인수인계,
  이미 대체된 제안서.
- 문서를 제거하면 README 링크와 문서 일관성 테스트도 같은 묶음에서 갱신한다.

`docs/superpowers/plans`와 `docs/superpowers/specs`의 과거 작업 문서는 우선 제거 후보로 두되,
현재 동작의 유일한 설명인 항목은 핵심 내용을 현행 문서로 옮긴 뒤 제거한다.

## 5. 코드와 의존성 정리 기준

### 도달 불가능 코드

웹 App Router 진입점, API route, 모바일 Expo Router 진입점, package script, Firebase 설정을
루트로 import graph를 만든다. 정적 import뿐 아니라 dynamic import, registry 문자열 매핑,
테스트 전용 import를 확인한다. 어떤 진입점에서도 도달하지 않고 공개 계약도 아닌 파일만
삭제한다.

### 대형 파일

큰 파일은 삭제 근거가 아니다. `PageWizardClient.tsx`, `pageWizardData.ts`, 관리자 화면,
초대장 서비스, 모바일 생성·관리 화면 등은 별도 리팩터링 후보로 기록하고 이번 정리에서
동작 변경이나 구조 분해를 하지 않는다.

### 의존성

루트와 모바일 `package.json`을 따로 점검한다. 코드 import가 없어도 Next.js, Expo,
ESLint, Firebase CLI나 설정 플러그인이 사용할 수 있으므로 manifest와 설정까지 확인한다.
제거 후 lock 파일을 기존 패키지 매니저로 갱신하고 웹·모바일 설치 및 검증을 통과해야 한다.

## 6. 삭제 순서

1. 정리 전 Git 상태, 용량, lint, typecheck, 핵심 테스트와 build 결과를 기준선으로 기록한다.
2. 삭제 후보와 근거, 영향 경로, 복구 방법을 manifest로 확정한다.
3. 과거 문서와 끊어진 링크를 정리하고 문서 검증을 실행한다.
4. 미참조 스크립트와 package scripts를 정리하고 관련 테스트를 실행한다.
5. 이미지·아이콘 설정을 통합하고 웹·모바일 렌더링을 확인한다.
6. 도달 불가능 코드와 미사용 의존성을 작은 묶음으로 제거한다.
7. 전체 자동 검증과 브라우저·모바일 수동 QA를 수행한다.
8. 마지막에 재생성 가능한 캐시와, 사용자가 원하는 경우 `node_modules`를 제거한다.
9. 빈 디렉터리를 확인하고 정리 전후 파일 수와 용량 차이를 보고한다.

## 7. 안전장치와 복구

- 실제 삭제 전 정확한 경로 목록을 사용자에게 제시하고 승인을 받는다.
- 추적 파일은 `git diff --name-status`로 삭제 범위를 확인한다.
- 무시된 캐시 파일은 Git으로 복구되지 않으므로 재생성 명령이 확인된 경로만 제거한다.
- 운영 데이터, Firebase 데이터, 배포, 브랜치, worktree, stash는 건드리지 않는다.
- 관련 없는 사용자 변경이 생기면 해당 묶음의 정리를 중단한다.
- 검증 실패 시 추가 삭제를 멈추고 기준선에도 있던 오류인지 이번 변경 오류인지 구분한다.

## 8. 검증 기준

- `npm run test:project-guardrails`
- `npm run test:route-docs-consistency`
- `npm run test:regression`
- `npm run typecheck:web`
- `npm run lint:web`
- `npm run typecheck:mobile`
- `npm run lint:mobile`
- `npm run build`
- 필요 시 Firebase emulator 기반 규칙 테스트
- 웹의 관리자, 고객 연결, 페이지 위저드, 공개 초대장 핵심 흐름 브라우저 확인
- 모바일 로그인, 생성, 관리, 이미지 업로드 주요 화면 확인

기준선에서 이미 실패한 검증은 별도 기존 오류로 기록한다. 정리로 새 실패가 생기면 완료로
처리하지 않는다.

## 9. 제외 범위

- 모바일 UX·상태 관리·대형 컴포넌트 리팩터링
- 신규 기능 추가
- 운영 데이터 삭제 또는 마이그레이션
- Firebase 보안 정책 완화
- 커밋, 푸시, 배포

