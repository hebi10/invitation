# Android 빌드·내부 테스트 자동 배포

## 요청과 범위
2026-11-04 사용자가 GitHub Actions APK/AAB 빌드부터 Google Play 업로드와 테스트 업데이트까지 자동화하도록 명시했다. 후속 요청에서 자동 배포 기본값을 내부 테스트, 비공개 테스트는 필요할 때 수동 선택하는 방식으로 확정했다. Google Play 연결은 새 Hebi App Release 프로젝트를 사용한다. 대상은 hebi10/invitation, Android 패키지 kr.msgnote.mobileinvitation이다. 현재1.0.5/code10은 Play 내부 테스트 초안에 업로드되어 있다.

## 구현 선택
기존 Expo prebuild/Gradle 빌드, Google 공식 인증 Action과 Android Publisher REST API를 유지한다. 인증은 새 프로젝트의 기존 WIF와 앱별 서비스 계정을 사용한다. JSON 비밀키를 새로 발급하는 방식은 사용하지 않는다. 별도 EAS/Expo 계정 연결이나 앱 의존성 추가는 필요하지 않다. REST API는 진행 중 심사를 취소하지 않는 commit 옵션과 실제 출시 상태 확인을 직접 다룰 수 있다.

## 동작
- PR 및 기존 빌드 브랜치는 APK/AAB 빌드만 수행한다. Secrets를 PR 코드에 전달하지 않는다.
- 서명·Play 배포는 정확한 main ref의 push 또는 수동 실행에서만 허용한다. 실제 자동 배포는 PLAY_AUTO_DEPLOY_ENABLED=true 이후 활성화한다.
- versionCode는 저장소 기준11 이상, GitHub run_number와 run_attempt를 포함하여 자동 증가시킨다. 표시 버전은1.0.5를 유지할 수 있다.
- APK는 zipalign 후 apksigner, AAB는 jarsigner로 기존 업로드 키를 사용한다. 둘 다 기존 청첩장 업로드 인증서 SHA256을 확인한다.
- main push 자동 배포 대상은 항상 internal이다. 수동 실행 입력 deploy_target은 internal(기본)/closed 중 선택하며, closed는 main workflow_dispatch에서만 허용한다. closed_track 입력 또는 PLAY_CLOSED_TRACK에 검증한 실제 비공개 ID가 있어야 한다. 운영·공개·공유용 예약 트랙과 폼 팩터 접두사는 거부한다.
- Node 배포 정책은 {target, track, status}를 반환하고 같은 값을 빌드 outputs와 Python --target/--track으로 전달한다. Python도 target/track 불일치를 쓰기 요청 전에 차단한다.
- Google 서비스 계정은 이 앱의 정보 조회·테스트 출시 권한만 사용한다. 기존 WIF provider는 projects/973619009476/locations/global/workloadIdentityPools/github/providers/github, 계정은 play-invitation@hebi-app-release-80847404.iam.gserviceaccount.com이다. GitHub 변수 PLAY_WORKLOAD_IDENTITY_PROVIDER/PLAY_SERVICE_ACCOUNT를 사용하며 JSON Secret은 필요하지 않다. id-token:write는 main 인증 job에 한정하고 PR/빌드 job에 주지 않는다. 기존 서명 Secrets4개와 인증서 검증을 보존한다.
- 실제 UI 내부 테스트 배포가 결제 설정에 종속되지 않도록, 정책에서 target/track 모두 internal로 검증된 경우에만 빈 RevenueCat 키로 서명할 수 있다. closed와 미확인 대상은 기존 운영 키 조건을 유지하고, 비어 있지 않은 잘못된 키는 항상 거부한다. 앱·서버 결제 코드는 변경하지 않는다. 현재 빈 키 경로는 SDK 설정·구매·영수증 저장·지급 전에 오류로 중단됨을 소스/모의 실행으로 확인했다.
- 배포 없는 main 실행에서는 서명/결제 설정과 독립적인 읽기 전용 인증 검사가 WIF와 internal 출시 조회 API를 검증한다. 이 검사는 Play 상태를 변경하지 않는다.
- Python 표준 라이브러리 게시 도구가 edit 생성, 트랙·버전 사전 검사, AAB 해시 확인 업로드, 대상 트랙 갱신, validate, commit, 실제 출시 상태 조회를 수행한다.
- API 쓰기 요청은 통신 실패 시 자동 반복하지 않는다. commit은 changesInReviewBehavior=ERROR_IF_IN_REVIEW를 지정한다. 다른 트랙의 심사·검토 대기 변경을 발견하면 중단한다.
- 심사 전송은 PLAY_SEND_FOR_REVIEW=true일 때만 활성화한다. 기본은 검토 전송 대기이며, 실제 테스터 제공·심사 중·초안 상태를 결과에 구분한다. Play가 첫 출시를 콘솔에서 요구하면 설정 변경이나 일반 오류의 초안 재시도로 우회하지 않는다.
- APK는 다운로드용 산출물이며 Play 설치본 업데이트는 Play에서 배포한 파일을 기준으로 한다.

## 외부 설정
사용자가 이미 연결한 Hebi App Release의 앱별 계정과 저장소별 WIF 권한을 재사용한다. 이전 invitation-35d60의 신규 서비스 계정/JSON 생성 계획은 폐기한다. 기존 앱의 서명 키 저장 대상은 hebi10/invitation Actions Secrets다. 신규 또는 확대되는 권한이 실제로 필요하면 그 범위를 확인한다. 프로덕션 출시는 포함하지 않는다.
