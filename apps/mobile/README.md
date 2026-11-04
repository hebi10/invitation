# Mobile Invitation App

기존 Next.js 웹 서비스와 분리된 Expo 모바일 앱입니다.

## 목적
- 기존 공개 웹 청첩장 서비스는 유지합니다.
- 모바일 앱은 `내 청첩장 / 만들기 / 이용 안내 / 설정` 4개 탭 구조로 구성합니다.
- 고객 계정 기반 구매와 1회용 앱 연동 링크, 저장된 세션 복원으로 청첩장을 관리합니다. 기존 `/manage` 딥링크는 매개변수를 보존해 내 청첩장으로 연결합니다.

## 시작 방법
1. 루트에서 `npm --prefix apps/mobile install`
2. 루트에서 `npm run mb:start`
3. Android 에뮬레이터는 `npm run mb:android`
4. 웹 미리보기는 `npm run mb:web`

## 환경 변수
- `EXPO_PUBLIC_API_BASE`: 모바일 앱이 호출할 API Base URL
- 값을 비워두면 앱 기본값은 운영 API `https://msgnote.kr`입니다.
- 로컬 Next 서버를 같은 PC에서 웹 미리보기로 붙일 때는 `http://localhost:3000` 또는 `http://localhost:3001`을 사용합니다.
- 실제 기기나 다른 에뮬레이터에서 로컬 서버를 붙일 때는 `localhost` 대신 개발 PC의 LAN IP 또는 Android 에뮬레이터용 `http://10.0.2.2:3000`, `http://10.0.2.2:3001`을 사용합니다.
- 로컬 개발용 값은 `apps/mobile/.env.local`에서만 덮어쓰고, 운영 빌드는 값을 비워 두거나 운영 도메인으로만 설정합니다.

## Google Play 결제 설정
- Android 앱 빌드 환경에 `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`를 설정합니다. RevenueCat의 Google Play 앱 공개 키(`goog_` 접두사)를 사용합니다. Test Store 키는 허용하지 않습니다.
- API 서버 환경에는 `REVENUECAT_SERVER_API_KEY`를 설정합니다. 서버 키는 모바일 앱에 넣지 않습니다.
- Play Console의 일회성 상품과 RevenueCat의 Google Play 상품을 다음 ID로 연결합니다: `page_creation_premium`, `ticket_pack_1`, `ticket_pack_3`, `ticket_pack_6`.
- 청첩장 제작은 PREMIUM 한 가지이며 5,000원, 생성일부터 기본 6개월입니다. PC와 모바일에 같은 기간을 적용합니다. Play Console에서도 `page_creation_premium`의 한국 가격을 KRW 5,000으로 맞춰야 구매가 진행됩니다. 기존 STANDARD/DELUXE ID는 과거 영수증 처리에만 유지합니다.
- 제작권과 티켓은 반복 구매가 필요하므로 RevenueCat에서 소모성 상품으로 설정합니다. Play Console에서 상품을 활성화하고 RevenueCat에 Google 서비스 계정 연결을 완료해야 합니다.
- 웹·Expo Go에서는 실제 구매를 확인할 수 없습니다. Google Play 내부 테스트 트랙에 배포한 Android 앱에서 라이선스 테스터로 상품 조회·구매·취소·서버 지급을 검증합니다.
- 데모 거래 생성과 서버 검증 우회는 제거되었습니다. 결제 설정이 없으면 오류를 표시하며, Google Play가 아닌 스토어의 거래는 지급하지 않습니다.
- 결제 후 서버 반영 실패 시 기기에 미처리 거래를 보관합니다. 같은 계정·상품·입력 정보로 다시 시도하면 재결제 없이 반영을 재시도합니다. 처리 전에는 앱 데이터 삭제나 재설치를 피하고, 정보를 복구할 수 없다면 주문번호로 고객 문의를 진행합니다.
- 공식 설정 안내: https://www.revenuecat.com/docs/getting-started/installation/expo

## 카카오톡 카드 공유
- 앱에서 청첩장 디자인을 선택하면 공개 웹 화면 `/mobile-share/{slug}/{theme}`을 브라우저로 엽니다. 해당 화면이 공식 Kakao JavaScript SDK를 호출하며, 수신자에게는 선택한 디자인의 하객용 공개 주소가 전달됩니다. 기본형은 `/{slug}`, 다른 디자인은 `/{slug}/{theme}`입니다.
- 공유 화면과 공유 카드에는 비공개 미리보기 주소, 편집 세션, 인증 토큰을 넣지 않습니다. 공개되지 않았거나 노출 기간이 시작되지 않았거나 종료된 청첩장은 공유할 수 없습니다.
- 운영 웹 서버에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 설정하고, Kakao Developers의 웹 플랫폼과 공유 링크 도메인에 실제 사용하는 운영 도메인(`https://msgnote.kr`, 사용 시 `https://www.msgnote.kr`)을 등록해야 합니다. 앱의 `EXPO_PUBLIC_API_BASE`도 공유 경로가 배포된 서버를 가리켜야 합니다.
- 공유 카드의 대표 사진은 외부에서 접근 가능한 HTTPS 주소로 설정합니다. 대표 사진이 없거나 카드 공유에 실패하면 주소 공유로 전환합니다.
- 운영 키·도메인 설정과 실제 Android 기기의 카카오톡 카드 수신·디자인별 공개 주소 이동 검증은 별도로 필요합니다.

## 현재 포함한 기능
- Expo Router 기반 하단 탭 앱 구조
- 고객 계정 로그인과 1회용 앱 연동 링크, 최근 연결 세션 복원
- SecureStore 기반 자동 로그인 복원
- 서비스/디자인/티켓 견적 계산과 제작 초안 저장
- 신랑/신부 한글·영문 이름 검증 후 URL 슬러그 자동 생성
- RevenueCat/Google Play 결제 확인 후 서버 검증을 거쳐 모바일 청첩장 자동 생성
- 연동된 청첩장 대상 티켓 추가 구매와 서버 지급
- 생성 직후 전체 화면 단계별 편집, 목차와 고정 저장 행동
- 로그인된 페이지의 공개 상태 변경
- 내용 저장과 최종 공개 설정 분리, 미저장 종료 확인, 버전 충돌 보호
- 계좌·교통·화환 안내의 항목별 입력과 미완성 항목 검증
- 이미지 업로드와 갤러리 편집
- 방명록 댓글 조회 및 삭제
- 디자인 선택과 공개 상태 확인을 거친 카카오톡 카드 공유
- 음악 카테고리·트랙 선택
- 라이트/다크 모드, 글자 크기 설정
- 작업별 접힘 이용 안내와 앱 정보

## 아직 남은 항목
- Google Play Console / RevenueCat 운영 상품 가격·연결 설정과 내부 테스트 트랙의 실제 조회·구매·취소·서버 지급 검증
- Kakao Developers 운영 키·도메인 등록과 실제 기기 카카오톡 공유 검증
- QR 코드 생성
- 앱 아이콘, 스플래시, 배포 설정

## 참고
- Expo Router 문서: https://docs.expo.dev/router/installation/
- Expo SecureStore 및 스토리지 패턴: https://docs.expo.dev/router/reference/authentication

## 검증
- `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run typecheck`
- `npm run android:verify:kotlin`
- `npm run android:verify:debug`

현재 모바일 앱은 Expo managed 구성이라 네이티브 Android 프로젝트가 저장소에 포함되어 있지 않습니다.
`android:verify:*` 스크립트는 이 상태를 확인하고, 네이티브 프로젝트가 생긴 경우 안전한 Gradle 검증 스크립트를 먼저 추가하도록 막습니다.

## GitHub에서 APK/AAB 빌드와 Play 비공개 테스트 배포
- `.github/workflows/mobile-release.yml`이 Expo prebuild/Gradle로 APK와 AAB를 생성합니다. Expo 계정 로그인과 `EXPO_TOKEN`은 필요하지 않습니다.
- PR에서는 인증 정보를 전달하지 않고 빌드를 검증합니다. 모바일 앱과 공통 `src/lib`, `src/contracts`, `src/types`, 루트 의존성 변경도 빌드를 실행합니다.
- 기본 로컬 Android 버전 코드는 `11`입니다. CI는 실행 번호와 재실행 번호를 포함해 버전 코드를 자동 생성하고 `EXPO_ANDROID_VERSION_CODE`로 전달합니다. 표시 버전과 생성된 버전 코드는 산출물 이름·요약에 함께 기록합니다.
- APK는 `zipalign` 후 `apksigner`로 서명하고 v2 서명과 인증서를 검증합니다. AAB는 `jarsigner`로 서명하고 인증서를 검증합니다. 기존 청첩장 업로드 인증서 SHA-256을 사용하며 다른 앱이나 새 키는 허용하지 않습니다.
- APK는 별도 설치용 산출물입니다. Google Play 앱 서명 키와 업로드 키가 다른 경우 Play 설치본을 이 APK로 직접 업데이트할 수 없습니다. 테스트 업데이트는 Play 배포를 기준으로 확인합니다.
- 서명·Play 배포는 `main`의 push 또는 수동 실행에서만 실행할 수 있습니다. 전체 검사와 테스트가 통과한 같은 커밋의 서명 AAB만 게시합니다. PR과 빌드 브랜치는 서명·배포를 수행하지 않습니다.

### 인증 정보
GitHub 저장소 `hebi10/invitation`의 Actions Secrets에 아래 값을 등록합니다. 실제 값은 문서·로그·Git에 넣지 않습니다.

| Secret | 용도 |
| --- | --- |
| `INVITATION_KEYSTORE_BASE64` | 기존 청첩장 업로드 JKS 파일의 Base64 |
| `INVITATION_KEYSTORE_PASSWORD` | JKS 비밀번호 |
| `INVITATION_KEY_ALIAS` | 기존 업로드 키 별칭 |
| `INVITATION_KEY_PASSWORD` | 업로드 키 비밀번호 |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | 이 앱의 테스트 출시용 Google 서비스 계정 JSON |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | 운영 Google Play 공개 키(`goog_`). 공개 키는 Variable로도 설정 가능 |

배포 작업은 `google-play-testing` environment를 사용합니다. 서비스 계정 JSON은 해당 Environment Secret으로 제한할 수도 있습니다. 서명 Secrets는 빌드 작업에서도 필요하므로 Repository Secret을 사용합니다.

서비스 계정은 Google Play Console에서 이 앱의 **앱 정보 보기**와 **테스트 트랙 출시** 권한만 부여합니다. 테스터 목록·프로덕션 출시·재무·관리자 권한은 필요하지 않습니다. Google Cloud의 Android Publisher API와 IAM Credentials API를 활성화하고, 공식 인증 Action의 access token 발급에 필요한 서비스 계정 자체의 Token Creator 역할을 확인합니다. JSON·서명 키를 GitHub에 새로 저장하거나 권한을 부여하는 단계는 사용자 확인 후 진행합니다.

### 배포 설정

| Actions Variable | 값과 의미 |
| --- | --- |
| `PLAY_AUTO_DEPLOY_ENABLED` | `true`이면 `main` 변경에 자동 배포 |
| `PLAY_CLOSED_TRACK` | 콘솔과 API에서 확인한 기존 비공개 테스트 트랙 ID. 기본값 없음 |
| `PLAY_RELEASE_STATUS` | `completed`가 기본값. 준비용 업로드는 명시적으로 `draft` 선택 |
| `PLAY_SEND_FOR_REVIEW` | `true`일 때 심사 제출. 기본값은 제출 보류 |

수동 실행의 `deploy`는 기본 `false`이며, `main`에서 `true`로 실행하면 지정 트랙에 게시합니다. 트랙을 새로 만들거나 테스터 목록을 바꾸지 않습니다. `production`, `beta`, `internal`, `qa`와 이 예약 이름의 폼 팩터 트랙은 거부합니다. 임의의 `closed` 이름이나 화면 표시명을 트랙 ID로 추측하지 않습니다.

### 게시와 검증
- 게시 도구는 대상 트랙·버전·AAB SHA-256을 검사합니다. 같은 버전의 다른 파일, 낮은 버전, 대상의 관계없는 초안·진행 중 릴리스, 다른 트랙의 심사·검토 대기 상태를 발견하면 중단합니다.
- commit에는 `changesInReviewBehavior=ERROR_IF_IN_REVIEW`를 지정하여 기존 심사를 취소하지 않습니다. Google Play API는 심사 전송 시 콘솔의 다른 제출 준비 변경도 함께 제출할 수 있습니다. 트랙 검사만으로 스토어 설명 등 모든 변경이 격리된다고 보장할 수 없으므로, 자동 심사 전송 활성화 전 게시 개요를 확인합니다.
- 처음 앱을 게시할 때 콘솔의 앱 설정·동의·첫 비공개 테스트 심사가 필요할 수 있습니다. 이런 오류를 초안 상태 변경이나 보안 옵션 해제로 우회하지 않습니다.
- 쓰기 API의 통신 결과가 불명확하면 같은 요청을 무조건 다시 보내지 않습니다. commit 후 읽기 API로 버전과 실제 출시 상태를 확인하며, `PUBLISHED`만 테스터 제공 중으로 표시합니다. `IN_REVIEW`, `NOT_SENT_FOR_REVIEW`, `DRAFT`는 각각 심사 중·심사 제출 대기·초안입니다.
- 서명 산출물은 Play 게시 실패와 별도로 Actions Artifacts에 보관합니다. 결제·서버 배포 설정과 실제 기기 구매·공유 검증은 이 자동화와 별도로 완료해야 합니다.

공식 안내: [Google 인증 Action](https://github.com/google-github-actions/auth), [Play 출시 트랙](https://developers.google.com/android-publisher/tracks), [API 동시 작업 주의사항](https://developers.google.com/android-publisher/concurrency-considerations).
