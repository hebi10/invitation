### Commit 메시지
- 최신 기준: `Add Google Play Billing fulfillment flow for mobile purchases`

### 작업 요약
1. 테마 확장 구조 정리
   - `src/lib/invitationThemes.ts` 기준으로 웹/모바일 공통 theme registry와 판매 정책을 분리했다.
   - Expo linked card, ticket modal, manage 화면은 `linkedThemes`와 `selectedTargetTheme` 기반으로 바꿔 2테마 고정 분기를 제거했다.
   - Next 렌더러는 `src/app/_components/themeRenderers/registry.ts`에서 관리하고 `WeddingInvitationPage.tsx`는 lookup만 담당한다.
2. Google Play Billing 초안 연동
   - `src/lib/mobileBillingProducts.ts`와 `apps/mobile/src/lib/mobileBillingProducts.ts`에 페이지 생성/티켓 SKU를 고정형으로 정의했다.
   - `apps/mobile/src/lib/billing.ts`, `src/server/mobileBillingServerService.ts`, `src/app/api/mobile/billing/fulfill/route.ts`로 RevenueCat 검증과 fulfillment 흐름을 추가했다.
   - 생성/티켓 구매 화면은 직접 지급 대신 Google Play 결제 후 서버 fulfillment를 타도록 변경했다.
3. Play Console 정책 대응 문서 정리
   - 개인정보처리방침은 `/privacy/mobile-invitation/`로 정리했고, 삭제 요청 전용 페이지를 `/privacy/mobile-invitation/delete-request/`에 추가했다.
   - Play Console의 계정 삭제 URL에는 `https://msgnote.kr/privacy/mobile-invitation/delete-request/`를 넣으면 된다.
   - `README.md`, `.env.example`에는 RevenueCat env와 dev build 전제를 반영했다.

### 남은 작업
1. Billing 런타임 검증
   - 현재 오프라인 환경이라 `react-native-purchases` 실제 설치와 EAS/dev build 검증을 못 했다.
   - 네트워크 가능한 환경에서 패키지 설치 후 Android 실기기 샌드박스 결제를 확인해야 한다.
2. RevenueCat/Play Console 실연동
   - `page_creation_standard|deluxe|premium`, `ticket_pack_1|3|6` 상품을 Play Console과 RevenueCat에 실제로 만들고 매핑해야 한다.
   - RevenueCat를 포함해 출시하면 Play 데이터 보안의 `Financial info > Purchase history`를 수집으로 추가해야 한다.
3. 계정 삭제 정책 마감
   - 현재 모바일 앱은 `pageSlug + password` 기반 인증과 앱 내 생성 흐름이 있어 Google이 앱 계정 생성으로 볼 가능성이 있다.
   - 다음 제출 전에는 앱 안에서도 삭제 요청 링크가 바로 보이게 하고, 데이터 보안/계정 삭제/개인정보처리방침 문구를 동일하게 맞춰야 한다.
   - 검증 완료: `npm run lint`, `npx tsc --noEmit`, `npm run build`
