### Commit 메시지
- 최신 기준: `Add Google Play Billing fulfillment flow for mobile purchases`

### 작업 요약
1. 공통 테마 확장 구조 정리
   - `src/lib/invitationThemes.ts`를 기준으로 웹/모바일이 같은 theme registry와 판매 정책을 보도록 정리했다.
   - Expo linked card, ticket modal, manage 화면은 `linkedThemes`와 `selectedTargetTheme` 기반으로 바꿔 2테마 고정 분기를 제거했다.
   - Next 렌더러는 `src/app/_components/themeRenderers/registry.ts`에서 관리하고, `WeddingInvitationPage.tsx`는 lookup만 담당한다.
2. Google Play Billing 도입용 SKU/지급 흐름 추가
   - `src/lib/mobileBillingProducts.ts`와 `apps/mobile/src/lib/mobileBillingProducts.ts`에 페이지 생성 SKU와 티켓 팩 SKU를 고정형으로 정의했다.
   - `apps/mobile/src/lib/billing.ts`에 `react-native-purchases` 기반 Billing 초기화/상품 조회/구매 추상화를 추가했다.
   - `src/server/mobileBillingServerService.ts`와 `src/app/api/mobile/billing/fulfill/route.ts`에서 RevenueCat subscriber 조회 기반 검증, transaction id 단위 중복 방지, 페이지 생성/티켓 지급 처리를 구현했다.
   - 생성/티켓 구매 화면은 가짜 결제 확인 대신 Google Play 결제 후 fulfillment를 타도록 바꿨고, 티켓 수량은 1/3/6 SKU에 맞춰 고정형으로 제한했다.
3. 문서 및 검증 정리
   - `README.md`, `.env.example`에 RevenueCat env와 development build 전제를 반영했다.
   - 검증: `npm --prefix apps/mobile run typecheck`, `npm --prefix apps/mobile run lint`, `npm run lint`, `npx tsc --noEmit`, `npm run build`

### 남은 작업
1. 패키지 실제 설치와 development build
   - 현재 상태: `apps/mobile/package.json`에 `react-native-purchases` 의존성은 반영됐지만 현재 오프라인 환경에서는 `npm --prefix apps/mobile install react-native-purchases`가 `ENOTCACHED`로 실패했다.
   - 남은 이유: 패키지가 실제 node_modules에 없어서 Expo runtime/EAS build에서 Billing을 아직 실행 검증하지 못했다.
   - 다음 작업 권장: 네트워크가 가능한 환경에서 패키지를 설치하고 development build 또는 production build를 다시 만든다.
2. RevenueCat/Play Console 실제 연동
   - 현재 상태: 앱/서버 코드는 `EXPO_PUBLIC_REVENUECAT_*`, `REVENUECAT_PUBLIC_API_KEY`, `REVENUECAT_SERVER_API_KEY`를 읽고 SKU도 고정돼 있다.
   - 남은 이유: Play Console 상품 생성, RevenueCat product mapping, 테스트 계정, 공개 API 키 주입이 아직 안 끝났다.
   - 다음 작업 권장: `page_creation_standard|deluxe|premium`, `ticket_pack_1|3|6` 상품을 Play Console과 RevenueCat에 만들고 내부 테스트 트랙에서 샌드박스 결제를 확인한다.
3. 모바일 실기기 마감
   - 현재 상태: 업로드 cleanup/포맷 보존/권한 UX/개인정보처리방침과 Billing fulfillment 코드까지 반영됐다.
   - 남은 이유: 대표 이미지/갤러리 업로드 실기기 검증, Billing 구매 성공 후 페이지 생성/티켓 적립, 문의 채널 확정이 아직 남아 있다.
   - 다음 작업 권장: Android 실기기에서 페이지 생성 결제, 티켓 팩 결제, 구매 재시도 idempotency, 업로드 시나리오를 함께 점검하고 개인정보처리방침 문의 URL을 최종 교체한다.
