# Android 빌드·비공개 테스트 자동 배포

## 요청과 범위
2026-11-04 사용자가 GitHub Actions APK/AAB 빌드부터 Google Play 업로드와 비공개 테스트 업데이트까지 자동화하도록 명시했다. 대상은 hebi10/invitation, Android 패키지 kr.msgnote.mobileinvitation이다. 현재1.0.5/code10은 Play 내부 테스트 초안에 업로드되어 있다.

## 구현 선택
기존 Expo prebuild/Gradle 빌드를 확장하고, Google 공식 인증 Action과 Android Publisher REST API를 사용한다. QuickCut은 APK GitHub Release 게시까지만 지원하여 Play 배포 코드를 그대로 복사할 수 없다. 별도 EAS/Expo 계정 연결이나 앱 의존성 추가는 필요하지 않다. REST API는 진행 중 심사를 취소하지 않는 commit 옵션과 실제 출시 상태 확인을 직접 다룰 수 있다.

## 동작
- PR 및 기존 빌드 브랜치는 APK/AAB 빌드만 수행한다. Secrets를 PR 코드에 전달하지 않는다.
- 서명·Play 배포는 정확한 main ref의 push 또는 수동 실행에서만 허용한다. 실제 자동 배포는 PLAY_AUTO_DEPLOY_ENABLED=true 이후 활성화한다.
- versionCode는 저장소 기준11 이상, GitHub run_number와 run_attempt를 포함하여 자동 증가시킨다. 표시 버전은1.0.5를 유지할 수 있다.
- APK는 zipalign 후 apksigner, AAB는 jarsigner로 기존 업로드 키를 사용한다. 둘 다 기존 청첩장 업로드 인증서 SHA256을 확인한다.
- Play 업로드는 설정한 PLAY_CLOSED_TRACK 하나만 사용하며, 운영·공개·내부 테스트 예약 ID는 거부한다. 실제 비공개 트랙 ID를 콘솔에서 확인해야 한다.
- Google 서비스 계정은 이 앱의 정보 조회·테스트 출시 권한만 사용한다. GitHub에는 서명 Secrets4개와 GOOGLE_PLAY_SERVICE_ACCOUNT_JSON이 필요하다. 기존 RevenueCat 운영 공개 키 준비 조건을 보존한다.
- Python 표준 라이브러리 게시 도구가 edit 생성, 트랙·버전 사전 검사, AAB 해시 확인 업로드, 대상 트랙 갱신, validate, commit, 실제 출시 상태 조회를 수행한다.
- API 쓰기 요청은 통신 실패 시 자동 반복하지 않는다. commit은 changesInReviewBehavior=ERROR_IF_IN_REVIEW를 지정한다. 다른 트랙의 심사·검토 대기 변경을 발견하면 중단한다.
- 심사 전송은 PLAY_SEND_FOR_REVIEW=true일 때만 활성화한다. 기본은 검토 전송 대기이며, 실제 테스터 제공·심사 중·초안 상태를 결과에 구분한다. Play가 첫 출시를 콘솔에서 요구하면 설정 변경이나 일반 오류의 초안 재시도로 우회하지 않는다.
- APK는 다운로드용 산출물이며 Play 설치본 업데이트는 Play에서 배포한 파일을 기준으로 한다.

## 외부 설정
새 자격 증명 등록이나 Google Play 접근 권한 부여는 코드와 검증 결과를 준비한 뒤 사용자 확인을 받는다. 기존 앱의 서명 키를 GitHub Secrets에 저장할 대상·범위를 명시한다. 프로덕션 출시는 포함하지 않는다.
