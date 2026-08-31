# 문서 허브

이 디렉터리는 모바일 청첩장 서비스의 운영, 도메인, 보안, 확장 작업 기준을 모아 둔 문서 공간입니다. 실제 구현 기준은 코드와 스크립트를 우선하며, 문서는 작업 전 맥락 확인과 변경 영향 범위 판단에 사용합니다.

## 먼저 읽을 문서

- [서비스 개요](./portfolio-service-overview.md): 웹, 모바일 앱, Firebase 기반 운영 구조 요약
- [이벤트 도메인 현재 기준](./event-domain-current-state.md): `events/{eventId}` 중심 저장 구조와 legacy 상태
- [서비스/저장소 경계](./service-repository-boundary.md): API, service, repository 계층의 책임 기준
- [API/저장소 연결 체크리스트](./api-repository-connection-checklist.md): 라우트와 저장소 경계 점검 항목
- [보안 강화 체크리스트](./security-hardening-checklist.md): 인증, 권한, 레이트리밋, 저장소 규칙 점검 기준

## 웹 청첩장

- [테마 확장 체크리스트](./new-theme-checklist.md): 공개 청첩장 테마 추가 작업 순서
- [테마 확장 테스트 계획](./theme-extension-test-plan.md): 테마 추가 후 검증 기준
- [이벤트 페이지 렌더러 레지스트리](./event-page-renderer-registry.md): 이벤트 타입별 렌더링 연결 방식
- [이벤트 생성 스텝 설정](./event-wizard-step-config.md): 이벤트 타입별 wizard step 구성 기준

## 이벤트 유형별 지원 테마

테마 개수는 문서에 고정하지 않고 `src/lib/invitationThemes.ts`와 이벤트 유형별 registry의 실제 등록값을 기준으로 확인합니다. 공통 메타데이터·판매 정책은 중앙 레지스트리에서 관리하고, 공개 페이지 연결은 `src/app/_components/eventPageRendererRegistry.tsx` 및 아래 renderer registry가 담당합니다.

| 이벤트 유형 | 지원 테마 키(표시명) | 공개 렌더 연결·테마 정의 기준 |
| --- | --- | --- |
| `wedding` | `emotional`(포트레이트 레터), `romantic`(가든 노트), `gyeol`(GYEOL/결), `simple`(고요한 예식), `classic-r`(레터프레스) | `src/app/_components/themeRenderers/registry.ts` |
| `first-birthday` | `first-birthday-pink`(퍼스트 챕터), `first-birthday-mint`(새벽 챕터) | `src/app/_components/firstBirthday/themeRenderers/registry.ts` |
| `birthday` | `birthday-minimal`(파티 노트), `birthday-floral`(생일 이야기) | `src/app/_components/birthday/themeRenderers/registry.ts` |
| `general-event` | `general-event-elegant`(프로그램 에디션), `general-event-vivid`(나이트 스케줄) | render adapter: `src/app/_components/eventPageRendererRegistry.tsx` · theme metadata: `src/lib/generalEventThemes.ts` |
| `opening` | `opening-natural`(스튜디오 오프닝), `opening-modern`(오프닝 포스터) | render adapter: `src/app/_components/eventPageRendererRegistry.tsx` · theme metadata: `src/lib/openingThemes.ts` |
| `seventieth`, `etc` | 비활성 준비 항목(공개 테마 없음) | `src/lib/eventTypes.ts` |

웨딩의 `gyeol`은 URL 키와 코드 식별자로 `gyeol`, 표시명으로 `GYEOL`/`결`을 사용하며, `classic-r`는 레터프레스 renderer와 `/classic-r` 경로를 사용합니다. `/{slug}/{theme}` 라우트는 이벤트 유형별 registry에 등록된 테마만 허용합니다.

## 모바일 앱

- [모바일 청첩장 연동 기준](./mobile-client-editor-policy.md): Expo 앱과 서버 API 연동, 권한, 편집 정책

## 이벤트 운영

- [이벤트 타입 레지스트리](./event-type-registry.md): 지원 이벤트 타입과 확장 기준

## 검증 스크립트

주요 검증 명령은 루트 `package.json` 기준으로 실행합니다.

- `npm run lint:web`
- `npm run typecheck:web`
- `npm run typecheck:mobile`
- `npm run check`
- `npm test`
- `npm run test:security`
- `npm run test:architecture`
- `npm run test:emulator`
- `npm run test:all`
- `npm run validate:theme-extension`

`npm run test:security`는 Firebase 에뮬레이터 없이 보안 헤더, 인증·인가 경계와 정적 정책을 검사하는 테스트 묶음입니다. `npm run test:emulator`는 Firebase CLI가 필요하며 Firestore·Storage 에뮬레이터를 `demo-invitation-rules` 프로젝트로 띄운 뒤 에뮬레이터 전용 테스트를 실행합니다. 로컬에서 실행할 때는 Firebase CLI와 에뮬레이터 실행에 필요한 Java 환경을 준비하고, 실제 운영 프로젝트 대신 에뮬레이터 프로젝트를 사용해야 합니다.
