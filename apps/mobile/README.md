# Mobile Invitation App

기존 Next.js 웹 서비스와 분리된 Expo 모바일 앱입니다.

## 목적
- 기존 공개 웹 청첩장 서비스는 유지합니다.
- 모바일 앱은 `홈 / 가이드 / 제작 / 운영 / 설정` 5개 탭 구조로 구성합니다.
- 페이지 URL 또는 슬러그 + 비밀번호 로그인, 자동 로그인, 운영 관리 흐름을 우선 연결합니다.

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
- 청첩장 제작은 PREMIUM 한 가지이며 9,900원입니다. Play Console에서도 `page_creation_premium`의 한국 가격을 KRW 9,900으로 맞춰야 구매가 진행됩니다. 기존 STANDARD/DELUXE ID는 과거 영수증 처리에만 유지합니다.
- 제작권과 티켓은 반복 구매가 필요하므로 RevenueCat에서 소모성 상품으로 설정합니다. Play Console에서 상품을 활성화하고 RevenueCat에 Google 서비스 계정 연결을 완료해야 합니다.
- 웹·Expo Go에서는 실제 구매를 확인할 수 없습니다. Google Play 내부 테스트 트랙에 배포한 Android 앱에서 라이선스 테스터로 상품 조회·구매·취소·서버 지급을 검증합니다.
- 데모 거래 생성과 서버 검증 우회는 제거되었습니다. 결제 설정이 없으면 오류를 표시하며, Google Play가 아닌 스토어의 거래는 지급하지 않습니다.
- 결제 후 서버 반영 실패 시 기기에 미처리 거래를 보관합니다. 같은 계정·상품·입력 정보로 다시 시도하면 재결제 없이 반영을 재시도합니다. 처리 전에는 앱 데이터 삭제나 재설치를 피하고, 정보를 복구할 수 없다면 주문번호로 고객 문의를 진행합니다.
- 공식 설정 안내: https://www.revenuecat.com/docs/getting-started/installation/expo

## 현재 포함한 기능
- Expo Router 기반 하단 탭 앱 구조
- 페이지 URL 또는 슬러그 + 비밀번호 모바일 로그인
- SecureStore 기반 자동 로그인 복원
- 서비스/디자인/티켓 견적 계산과 제작 초안 저장
- 신랑/신부 한글·영문 이름 검증 후 URL 슬러그 자동 생성
- RevenueCat/Google Play 결제 확인 후 서버 검증을 거쳐 모바일 청첩장 자동 생성
- 연동된 청첩장 대상 티켓 추가 구매와 서버 지급
- 생성 직후 운영 탭 온보딩 슬라이드 입력
- 로그인된 페이지의 공개 상태 변경
- 핵심 문구 저장
- 이미지 업로드와 갤러리 편집
- 방명록 댓글 조회 및 삭제
- 라이트/다크 모드, 글자 크기, API 주소 설정

## 아직 남은 항목
- Google Play Console / RevenueCat 운영 상품 검수
- 음악 트랙 상세 선택
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
