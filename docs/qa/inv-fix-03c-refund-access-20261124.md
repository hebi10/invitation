# INV-FIX-03-C — 관리자 환불 이용 보류/해제 (2026-11-24)

신규 5,000원 청첩장 제작 구매만 대상으로 한다. 기본 비활성: INVITATION_REFUND_ACCESS_REVIEW_ENABLED=true를 운영 승인 후 설정해야 신규 보류할 수 있다. 기존 보류 해제는 플래그를 끈 경우에도 가능하다.

- 서버에서 Google Play 최근 환불 거래를 재조회하고, 지급 완료된 premium 제작 기록의 거래 해시·eventId·활성 slug·현재 소유권을 Firestore transaction으로 재검증한다. 타 고객, 소유권 이전, 기존 티켓/기간 연장, 불완전 거래는 별도 확인한다.
- 관리자 명시적 확인 후 공개 이용만 보류: published/visibility.published=false, billingAccessHold 보호 필드, 별도 server-only billingRefundReviews 검토 기록. 구매 원장·초대장 내용·사진·기간·계정은 보존한다.
- 공개 웹·요약·방명록·Firestore/Storage Rules 및 서버 재공개 차단. 기존 장기 이미지 토큰 직접 접근은 별도 INV-FIX-02 이관 필요. 추억 페이지의 독립 공개 정책은 변경하지 않는다.
- 해제는 기록 정정/대체 결제 검토/예외 승인 사유를 관리자가 선택하며 자동 재공개하지 않는다. 30일이 지난 보류도 독립 조회 목록에서 확인 가능.
- 운영 승인 전 플래그 활성화, rules 배포, 고객 결제·환불·권한 조정, Play 배포 금지. 운영 테스트 계정으로 보류·재공개 거부·해제와 기존 앱 호환성을 검증한다.
