# 문서 허브

이 디렉터리는 모바일 청첩장 서비스의 운영, 도메인, 보안, 확장 작업 기준을 모아 둔 문서 공간입니다. 실제 구현 기준은 코드와 스크립트를 우선하며, 문서는 작업 전 맥락 확인과 변경 영향 범위 판단에 사용합니다.

## 먼저 읽을 문서

- [서비스 개요](./portfolio-service-overview.md): 웹, 모바일 앱, Firebase 기반 운영 구조 요약
- [이벤트 도메인 현재 기준](./event-domain-current-state.md): `events/{eventId}` 중심 저장 구조와 legacy 상태
- [서비스/저장소 경계](./service-repository-boundary.md): API, service, repository 계층의 책임 기준
- [API/저장소 연결 체크리스트](./api-repository-connection-checklist.md): 라우트와 저장소 경계 점검 항목
- [보안 강화 체크리스트](./security-hardening-checklist.md): 인증, 권한, 레이트리밋, 저장소 규칙 점검 기준

## 웹 청첩장

- [새 테마 추가 체크리스트](./new-theme-checklist.md): 공개 청첩장 테마 추가 작업 순서
- [테마 확장 테스트 계획](./theme-extension-test-plan.md): 테마 추가 후 검증 기준
- [이벤트 페이지 렌더러 레지스트리](./event-page-renderer-registry.md): 이벤트 타입별 렌더링 연결 방식
- [웹 생성 흐름 정리](./web-page-wizard-alignment.md): `/page-wizard` 생성 흐름 기준
- [이벤트 생성 스텝 설정](./event-wizard-step-config.md): 이벤트 타입별 wizard step 구성 기준

## 모바일 앱

- [모바일 청첩장 연동 기준](./mobile-client-editor-policy.md): Expo 앱과 서버 API 연동, 권한, 편집 정책
- [Expo 영향 범위 점검](./expo-impact-assessment.md): 웹 변경이 모바일 앱에 미치는 영향 확인
- [Expo 수동 QA 리포트](./expo-manual-qa-report.md): 모바일 수동 확인 기록
- [고객 지갑/상거래 계획](./customer-wallet-commerce-plan.md): 모바일 결제와 티켓 운영 계획

## 이벤트 운영

- [이벤트 백필 실행 가이드](./event-backfill-runbook.md): 이벤트 도메인 백필 실행 절차
- [이벤트 운영 모니터링 가이드](./event-rollout-monitoring.md): rollout 상태와 mismatch 점검 방식
- [이벤트 전환 체크리스트](./event-cutover-checklist.md): legacy 전환과 운영 확인 항목
- [이벤트 타입 레지스트리](./event-type-registry.md): 지원 이벤트 타입과 확장 기준
- [생일 이벤트 PoC](./event-type-birthday-poc.md): 생일 이벤트 타입 도입 기록

## 관리자/운영 UI

- [관리자 대시보드 탭 레이아웃](./admin-dashboard-tab-layout.md): 관리자 화면 탭 구조 기준

## AI 작업 인수인계

- [AI 하네스 인수인계](./ai-harness-handoff.md): 이전 AI 작업 상태 기록
- [AI 하네스 인수인계 템플릿](./ai-harness-handoff.template.md): 새 인수인계 작성 템플릿

## 검증 스크립트

주요 검증 명령은 루트 `package.json` 기준으로 실행합니다.

- `npm run lint:web`
- `npm run typecheck:web`
- `npm run typecheck:mobile`
- `npm run check`
- `npm run test:smoke`
- `npm run qa:event-rollout`
