# Android 자동 배포 구현 계획

**Goal:** GitHub에서 APK/AAB 생성·서명·Play 비공개 테스트 업데이트를 실행한다.
**Architecture:** 기존 Gradle workflow 확장, 공식 Google OAuth 인증, 표준 Python REST 게시 도구.
**Tech Stack:** GitHub Actions, Expo55/Gradle, Android SDK, Python3 표준 라이브러리.
**Spec:** docs/superpowers/specs/2026-11-04-play-automation-design.md

## 공통 제약
- 패키지 kr.msgnote.mobileinvitation, 다음 로컬 versionCode11, SHA256 기존0C539396DA7BAE224EDC46C6250C54F65D7CEF3B310D845D672B5848B98EF20F.
- 서명/배포는 main push/dispatch, PR에 Secrets 금지. 배포 opt-in 및 지정 closed트랙, 심사 전송 opt-in.
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
- 전체134개 registry 테스트(게시 도구24개 unittest 포함), npm run check, 공식 actionlint1.7.12, Bash 구문, Expo config 평가 및 독립 리뷰 통과.
- GitHub Actions Secrets/Variables는 처음 확인 시 모두 비어 있었다. PLAY_AUTO_DEPLOY_ENABLED=false, PLAY_SEND_FOR_REVIEW=false, PLAY_RELEASE_STATUS=completed 기본값을 준비했다.
- Play Alpha는 비활성이고 기존1.0.1 초안과 미완료 트랙 설정이 있다. 실제 API 트랙 ID는 서비스 계정 연결 후 재확인하며 기존 초안을 자동 덮어쓰지 않는다.
- 실제 네이티브 APK 서명·Play API 인증·비공개 테스트 배포는 외부 인증/권한 설정 후 실행해야 한다.
