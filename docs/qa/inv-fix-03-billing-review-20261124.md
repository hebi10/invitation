# INV-FIX-03 — 환불 거래 확인 및 복구 안전성

- 기존 신규 결제 5,000원/6개월 및 영수증 서버 검증·소유권 검사·멱등성은 그대로 유지한다.
- 관리자 인증 GET /api/admin/billing/voided-purchases: Google Play Voided Purchases API 일회성 상품만 최근 30일 조회, 토큰 해시로 기존 billingFulfillments와 대조. 원본 구매 토큰·고객 UID·주문 ID를 반환하거나 로그에 남기지 않는다. 중복 제거 및 페이지 한도 초과/오류 시 실패 처리한다.
- 이미 지급된 상품의 소유권이 이전되었거나 환불이 승인된 사유가 다를 수 있으므로 자동 삭제·비공개·환수는 하지 않는다. 관리자 검토 대상만 반환한다. 실제 환불 이후 이용 권한 정지 정책, 운영 승인 및 안전한 적용 절차, 장기 이력 확보를 위한 주기적 동기화/관리 UI는 후속 작업이다. 환불 API는 최근 30일 범위만 제공한다.
- 운영 테스트: 라이선스 테스터, 결제/취소/보류/강제 종료/복구, 환불 후 기존 구매 복원 거절, 관리자 검토 조회 권한 및 운영 Play 권한. 실제 고객 거래를 변경하지 않는다.
- 이 PR에서 운영 API 호출, 테스트 구매, Play 게시, Firestore 쓰기는 수행하지 않는다.

공식 API: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.voidedpurchases/list
