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

## GitHub에서 Android AAB 빌드
- `.github/workflows/mobile-release.yml`은 QuickCut과 같이 GitHub runner에서 직접 Gradle로 AAB를 만듭니다. Expo 계정 로그인과 `EXPO_TOKEN`은 필요하지 않습니다. Expo prebuild로 생성한 네이티브 프로젝트는 Git에 넣지 않습니다.
- 모바일 변경 PR, `main` 또는 `build/mobile-aab` 브랜치의 모바일 변경, 수동 실행을 지원합니다. 수동 실행 메뉴는 workflow가 기본 브랜치에 반영된 후 표시됩니다.
- 현재 버전은 `1.0.5` / Android `versionCode: 10`입니다. 다음 Play 업로드 때는 `app.config.ts`의 번호를 기존 업로드보다 크게 올립니다. 이 직접 빌드는 EAS 원격 버전 자동 증가를 사용하지 않습니다.
- 기본 산출물은 **미서명 AAB**이며 Play에 바로 업로드할 수 없습니다. Expo 템플릿의 릴리스 디버그 서명을 명시적으로 해제합니다.
- PR 이외 실행에서 다음 GitHub Secrets 4개가 모두 있으면 기존 청첩장 키로 후서명합니다: `INVITATION_KEYSTORE_BASE64`, `INVITATION_KEYSTORE_PASSWORD`, `INVITATION_KEY_ALIAS`, `INVITATION_KEY_PASSWORD`. 모두 없으면 미서명 AAB만 보관하며, 일부만 있으면 실패합니다. 다른 앱의 키나 새 키를 사용하지 않습니다.
- 실제 구매가 가능한 배포용 서명에는 GitHub 변수 또는 Secret `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`의 운영 Google Play 공개 키(`goog_` 접두사)가 필요합니다. EAS 환경 변수는 이 직접 빌드에 자동 전달되지 않습니다. 서버 키는 앱에 넣지 않습니다.
- AAB는 Actions 실행의 Artifacts에 14일간 보관합니다. 서명 파일만 별도 이름으로 보관하며, Play 업로드·테스터 배포·공개 출시는 자동으로 수행하지 않습니다.
