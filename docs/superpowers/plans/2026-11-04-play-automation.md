# Android 자동 배포 구현 계획

**Goal:** GitHub에서 APK/AAB 생성·서명·Play 내부 테스트 자동 업데이트와 비공개 테스트 수동 선택을 실행한다.
**Architecture:** 기존 Gradle workflow 확장, Hebi App Release의 WIF·앱별 계정을 이용한 공식 Google OAuth 인증, 표준 Python REST 게시 도구.
**Tech Stack:** GitHub Actions, Expo55/Gradle, Android SDK, Python3 표준 라이브러리.
**Spec:** docs/superpowers/specs/2026-11-04-play-automation-design.md

## 공통 제약
- 패키지 kr.msgnote.mobileinvitation, 다음 로컬 versionCode11, SHA256 기존0C539396DA7BAE224EDC46C6250C54F65D7CEF3B310D845D672B5848B98EF20F.
- 서명/배포는 main push/dispatch, PR에 Secrets 금지. main 자동 배포는 internal 고정, closed는 main 수동 선택과 실제 트랙 ID 필수. 심사 전송 opt-in.
- 인증정보 출력·Git 저장 금지. 앱 의존성·런타임 제품 동작 변경 금지.

## 검토 초점
잘못된 트랙, 중복/낮은 버전, 비일치 업로드 해시, 진행 중 심사·대기 변경, commit 통신 결과 불명확 상태를 명시적으로 검사한다.

## 작업
- [x] 빌드 정책: 실패 테스트부터 작성한다. app.config.ts 환경 버전 override, 유일한 CI versionCode, 동적 산출물 이름, APK+AAB 빌드·서명·인증서 검사, main/PR 분리와 공통 소스 트리거를 구현한다.
- [x] Play 게시: 테스트에서 HTTP 경계를 대체하여 실제 요청 순서를 검증한다. scripts/publish-mobile-play.py와 scripts/test_publish_mobile_play.py를 작성한다. OAuth token은 PLAY_ACCESS_TOKEN, CLI는 --aab/--version-code/--track/--release-name/--notes-file/--status(draft|completed)/--send-for-review를 사용한다. 결과와 GitHub 출력·요약에 실제 상태를 기록한다.
- [x] 통합: 공식 auth@v3의 access_token_scopes=androidpublisher, create_credentials_file=false와 환경 token을 사용한다. README·출시 노트·테스트 registry를 갱신한다.
- [x] 검증: 실패→성공 테스트, 전체 npm test·lint·typecheck, workflow 정적 검사 및 독립 검토 후 기존 PR에 반영한다.
- [ ] 외부 연결: 실제 비공개 트랙과 GitHub Secrets 이름을 읽기 전용 확인한다. 자격 증명·신규 권한 등록은 구체적 결과를 제시한 뒤 사용자 확인이 필요하다. 계정 설정과 실제 API 배포 검증 여부를 구분한다.

## 실제 확인 결과
- 전체134개 registry 테스트(게시 도구26개 unittest 포함), npm run check, 공식 actionlint1.7.12, Bash 구문, Expo config 평가 및 독립 리뷰 통과.
- GitHub Actions Secrets/Variables는 처음 확인 시 모두 비어 있었다. PLAY_AUTO_DEPLOY_ENABLED=false, PLAY_SEND_FOR_REVIEW=false, PLAY_RELEASE_STATUS=completed 기본값을 준비했다.
- Play Alpha는 비활성이고 기존1.0.1 초안과 미완료 트랙 설정이 있다. 실제 API 트랙 ID는 서비스 계정 연결 후 재확인하며 기존 초안을 자동 덮어쓰지 않는다.
- 실제 네이티브 APK 서명·Play API 인증·비공개 테스트 배포는 외부 인증/권한 설정 후 실행해야 한다.

- 최초 GitHub 실행에서 배포 job의 운영 모드가 단위 테스트에 전파된 문제와 Python3.14의 미종료 HTTPError ResourceWarning을 확인했다. 검사 step만 NODE_ENV=test로 분리하고 모든 오류 응답을 finally에서 닫도록 보완했다. 운영 Secret 추가·토큰 검사 완화 없이 회귀 테스트와 독립 검토를 통과했다.

## 내부 테스트·WIF 전환
- [x] 정책/워크플로: scripts/mobile-release-policy.mjs, .github/workflows/mobile-release.yml, scripts/test-mobile-release-automation.mts. push는 internal, 수동 closed만 실제 ID 필수, {target,track,status} 및 동일 outputs 전달을 RED→GREEN으로 검증한다. auth@v3는 기존 WIF 변수로 전환하고 main 인증 job에만 OIDC 권한을 준다. 서명과 독립적인 읽기 전용 접근 검사도 검증한다.
- [x] 서명 준비 조건: scripts/sign-mobile-release.sh. 공통 대상 정책 outputs를 서명 단계에 전달하고, 정확히 internal/internal일 때만 빈 결제 공개 키를 허용한다. closed/미확인 대상과 잘못된 비어 있지 않은 키 차단을 실제 --check 실행으로 검증한다. 앱·서버 구매/지급 코드는 보존한다.
- [x] 게시 도구: scripts/publish-mobile-play.py, scripts/test_publish_mobile_play.py. --target internal|closed(default internal)와 --track의 일치, 예약 이름/접두사 거부, 두 트랙의 성공/초안 보호 및 기존 불명확 commit 처리를 RED→GREEN으로 검증한다.
- [x] 통합 검증: README를 실제 입력/변수와 맞추고 npm run check, npm test, actionlint 및 독립 검토를 통과했다. 기존 PR에 반영한다.
- [ ] 외부 연결/실행: 기존 Hebi App Release WIF 변수·계정, 서명 Secrets/운영 결제 키, 현재 internal 초안을 확인한다. main 반영 후 실제 OIDC/읽기 API와 가능한 빌드·서명·업로드를 검증하고 완료 상태와 차단 원인을 구분한다.

내부 전환 검증: 전체134개 테스트(Python31개 포함), 대상별 실제 Bash 사전검사와 Node 워크플로 검사, actionlint, bash -n 및 독립 재리뷰 통과. 서명 인증서를 재검증한 기존 키의 Secrets4개를 등록했고, 저장되어 있던 code10은 콘솔에서 내부 테스터에게 제공됨을 확인했다. WIF 설정값도 저장소에서 재확인했으며 새 자동화의 실서명·API 게시 검증은 main 반영 후 수행한다.
