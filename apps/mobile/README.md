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

- 신규 청첩장 제작은 Google Play 일회성 소모성 상품 `page_creation_premium` 5,000원 / 최초 6개월 고정입니다. 신규 기간 연장·티켓 판매는 지원하지 않습니다.
- Android 클라이언트는 `expo-iap`의 Google Play Billing을 사용합니다. RevenueCat 로그인·공개 키는 필요하지 않습니다. 네이티브 결제는 Expo Go가 아닌 실제 서명 Android 앱에서 테스트해야 합니다.
- 결제 전 스토어에서 상품을 조회해 한국 판매 가격이 정확히 KRW 5,000인지 확인합니다. 고객 UID는 SHA-256으로 가려 Google Play 결제 요청의 `obfuscatedAccountId`에 연결합니다.
- 서버는 Google Play Developer API `purchases.productsv2.getproductpurchasev2`로 **구매 토큰**을 매번 검증하고, `PURCHASED`, 올바른 SKU·수량·환불 여부·구매 계정·구매 완료일을 확인한 이후에만 6개월 청첩장 권리를 지급합니다. 클라이언트에서 전달한 거래 ID나 성공 메시지 자체는 신뢰하지 않습니다.
- 운영 서버의 Google Play API 인증은 Google Cloud Application Default Credentials(ADC) 또는 서버에서만 접근할 수 있는 `GOOGLE_PLAY_BILLING_SERVICE_ACCOUNT_JSON`으로 구성합니다. Google Cloud 서비스 계정에 Play Developer API 호출 및 대상 앱 주문/구독 읽기 권한이 필요합니다. 비밀키·토큰을 앱 번들이나 GitHub 커밋에 넣지 않습니다.
- 거래 내역은 서버 Firestore 지급 잠금과 연결하여 동일 구매 토큰/정식 주문 ID로 중복 지급하지 않습니다. 구매가 검증돼 청첩장 생성까지 완료한 후에만 `finishTransaction(isConsumable=true)`를 호출해 Google Play 상품을 소비합니다. 처리가 중단되면 구매 토큰과 대상 청첩장 입력 정보를 안전한 로컬 저장소에 보관해 **추가 결제 없이 복구**합니다.
- 과거 RevenueCat 기반 영수증·고객 이용 권리·서버 지급 기록은 삭제하지 않습니다. 구매 토큰이 없는 과거 미처리 거래는 임의 지급/재결제하지 않고 고객 지원을 통해 검토합니다.
- Google Play Console의 `page_creation_premium` 활성 한국 구매 옵션 및 정확히 5,000원, 실제 테스트 참여자와 **라이선스 테스터**를 확인하기 전까지 실결제를 진행하지 않습니다. 현재 Play API 사전점검에서는 한국 활성 구매 옵션이 확인되지 않았습니다.
- Android 테스트 배포는 서명 Secret 4개 및 Google Play WIF를 재사용합니다. RevenueCat 키가 없어도 `main`의 `internal` 또는 명시적 `alpha` 비공개 트랙 빌드를 실행할 수 있지만, 결제 구매 성공 여부는 별도의 Play 테스트 카드·실기기·서버 검증 QA로 확인해야 합니다.

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
- 과거 미처리 결제 영수증만 소유자 계정·거래 시각 검증 후 복구 (신규 기간 연장 판매 없음)
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

## GitHub에서 APK/AAB 빌드와 Play 테스트 배포
- `.github/workflows/mobile-release.yml`이 Expo prebuild/Gradle로 APK와 AAB를 생성합니다. Expo 계정 로그인과 `EXPO_TOKEN`은 필요하지 않습니다.
- PR에서는 인증 정보를 전달하지 않고 빌드를 검증합니다. 모바일 앱과 공통 `src/lib`, `src/contracts`, `src/types`, 루트 의존성 변경도 빌드를 실행합니다.
- 기본 로컬 Android 버전 코드는 `11`입니다. CI는 실행 번호와 재실행 번호를 포함해 버전 코드를 자동 생성하고 `EXPO_ANDROID_VERSION_CODE`로 전달합니다. 표시 버전과 생성된 버전 코드는 산출물 이름·요약에 함께 기록합니다.
- APK는 `zipalign` 후 `apksigner`로 서명하고 v2 서명과 인증서를 검증합니다. AAB는 `jarsigner`로 서명하고 인증서를 검증합니다. 기존 청첩장 업로드 인증서 SHA-256을 사용하며 다른 앱이나 새 키는 허용하지 않습니다.
- 고정 버전·SHA-256으로 확인한 `bundletool`로 서명 AAB를 검증하고 패키지·버전이 APK 및 소스와 일치하는지 확인합니다. 서명 산출물의 `provenance.json`에는 소스 SHA·버전·GitHub 실행·APK/AAB SHA-256을 기록하며, 게시 job이 다운로드 후 Google 인증 전에 다시 검사합니다.
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
| `GOOGLE_PLAY_BILLING_SERVICE_ACCOUNT_JSON` | 서버 전용 Play Developer API 권한의 서비스 계정 JSON (앱 빌드 Secret 아님; 운영 서버 환경에만 설정) |

배포 작업은 `google-play-testing` environment를 사용합니다. 서명 Secrets는 빌드 작업에서도 필요하므로 Repository Secret을 사용합니다. Google 인증은 GitHub OIDC와 기존 WIF 연결을 이용하여 단기 access token을 발급합니다. 서비스 계정 JSON 비밀키 Secret은 사용하지 않습니다.

Google Cloud 프로젝트는 `Hebi App Release` (`hebi-app-release-80847404`)입니다. 청첩장 전용 계정 `play-invitation@hebi-app-release-80847404.iam.gserviceaccount.com`과 이 저장소 ID에 제한된 기존 WIF 권한을 재사용합니다. 이 앱의 **앱 정보 보기**와 **테스트 트랙 출시** 권한으로 동작하며, 다른 앱의 서비스 계정을 사용하지 않습니다. `id-token: write`는 main의 인증 작업에만 있고 PR·Android 빌드 작업에는 없습니다.

정책 검사를 통과한 `internal` 빌드는 RevenueCat 공개 키가 비어 있어도 UI·공유 기능 점검용으로 서명할 수 있습니다. 이 경우 앱의 상품 조회·구매는 설정 오류로 중단되고 서버의 영수증 검증·지급 조건도 유지됩니다. 키가 없다고 구매나 청첩장 지급을 성공 처리하지 않습니다. 비공개 테스트 선택과 대상 미확인 서명에는 기존 운영 키 조건을 유지하며, 비어 있지 않은 잘못된 키는 내부 테스트에서도 거부합니다.

### 배포 설정

| Actions Variable | 값과 의미 |
| --- | --- |
| `PLAY_AUTO_DEPLOY_ENABLED` | `true`이면 `main` 변경에 내부 테스트(`internal`) 자동 배포 |
| `PLAY_WORKLOAD_IDENTITY_PROVIDER` | `projects/973619009476/locations/global/workloadIdentityPools/github/providers/github` |
| `PLAY_SERVICE_ACCOUNT` | `play-invitation@hebi-app-release-80847404.iam.gserviceaccount.com` |
| `PLAY_CLOSED_TRACK` | 비공개 테스트 수동 선택 시 실제 API 트랙 ID를 재지정. 입력·변수가 없으면 기존 `alpha`를 조회하며, 미존재·미완료 출시이면 중단 |
| `PLAY_RELEASE_STATUS` | `completed`가 기본값. 준비용 업로드는 명시적으로 `draft` 선택 |
| `PLAY_SEND_FOR_REVIEW` | 이전 저장소 변수는 사용하지 않음. 승인된 테스트 배포 workflow가 `'true'`를 명시하여 자동 심사 앱의 제출 방식 사용 |

수동 실행은 Actions의 해당 workflow에서 `main`을 선택합니다. `deploy`가 `false`이면 빌드와 읽기 전용 Play 접근 검사만 실행합니다. 실제 배포는 `deploy=true`로 실행하며, `deploy_target`은 `internal`이 기본입니다. 비공개 테스트는 `deploy_target=closed`를 명시적으로 선택합니다. 트랙은 `closed_track` 입력, `PLAY_CLOSED_TRACK` 변수, 기존 `alpha` 순서로 확인하며 트랙을 새로 만들거나 기존 초안을 버리지 않습니다. main push는 이 입력이나 비공개 트랙 변수와 무관하게 항상 internal로 배포합니다.

트랙을 새로 만들거나 테스터 목록을 바꾸지 않습니다. `production`, `beta`, `internalsharing`, `qa`와 폼 팩터 접두사 ID는 거부하며, closed 선택에서 `internal`도 거부합니다. 임의의 `closed` 이름이나 화면 표시명을 트랙 ID로 추측하지 않습니다. 읽기 전용 접근 검사는 기존 internal 트랙의 실제 출시 상태를 조회하며, 앱 업로드나 출시 변경을 수행하지 않습니다.

### 게시와 검증
- 게시 도구는 대상 트랙·버전·AAB SHA-256을 검사합니다. 같은 버전의 다른 파일, 낮은 버전, 대상의 관계없는 초안·진행 중 릴리스, 다른 트랙의 심사·검토 대기 상태를 발견하면 중단합니다.
- commit에는 `changesInReviewBehavior=ERROR_IF_IN_REVIEW`를 지정하여 기존 심사를 취소하지 않습니다. 이 앱은 자동 심사 방식이므로 승인된 테스트 배포는 `--send-for-review`를 전달하고, Google이 거부하는 `changesNotSentForReview` 매개변수를 생략합니다. CLI에서 이 플래그를 생략하면 기존처럼 보류 요청(`changesNotSentForReview=true`)을 유지하며, 거부되어도 제출 방식 변경이나 자동 재시도를 하지 않습니다. Google Play API는 콘솔의 다른 제출 준비 변경도 함께 제출할 수 있으므로 실행 전 게시 개요를 확인합니다.
- 처음 앱을 게시할 때 콘솔의 앱 설정·동의·첫 비공개 테스트 심사가 필요할 수 있습니다. 이런 오류를 초안 상태 변경이나 보안 옵션 해제로 우회하지 않습니다.
- 쓰기 API의 통신 결과가 불명확하면 같은 요청을 무조건 다시 보내지 않습니다. commit 후 읽기 API로 버전과 실제 출시 상태를 확인하며, `PUBLISHED`만 테스터 제공 중으로 표시합니다. `IN_REVIEW`, `NOT_SENT_FOR_REVIEW`, `DRAFT`는 각각 심사 중·심사 제출 대기·초안입니다.
- 서명 산출물은 Play 게시 실패와 별도로 Actions Artifacts에 보관합니다. 결제·서버 배포 설정과 실제 기기 구매·공유 검증은 이 자동화와 별도로 완료해야 합니다.

공식 안내: [Google 인증 Action](https://github.com/google-github-actions/auth), [Play 출시 트랙](https://developers.google.com/android-publisher/tracks), [API 동시 작업 주의사항](https://developers.google.com/android-publisher/concurrency-considerations).

## 모바일 청첩장 디자인 에셋 (2026-11-04)

- 앱 아이콘: `assets/icon-v3.png` (1024×1024, RGBA)
- Play 등록용 아이콘: `store/icon.png` (512×512, RGBA)
- 앱 아이콘 원본: `assets/editorial/app-icon-design-source.webp`
- 웨딩 화보 원본: `assets/editorial/*.webp` (기능별 독립 에셋)
- 웨딩 테마 실제 화면 미리보기: `assets/theme-previews/{simple,classic-r,romantic,gyeol,emotional}.jpg` (780×1440)

테마 이미지에는 개발 도구 아이콘과 브라우저 스크롤바가 포함되지 않습니다. 캡처는 `scripts/capture-clean-wedding-previews.mjs`로 재현할 수 있고 아이콘 출력은 `scripts/build-wedding-editorial-icon.mjs`로 생성할 수 있습니다. 해당 이미지·아이콘은 Expo 앱 에셋이며, Play Console의 스토어 등록정보 업데이트는 별도로 확인해야 합니다.
