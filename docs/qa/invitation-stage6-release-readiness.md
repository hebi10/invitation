# Invitation 6단계 — 출시 전 기능 회귀 및 운영 인수

기준: 2026-11-08 · GitHub `hebi10/invitation` · 공개 테스트 커플 신민제·김현지 · 현재 단계: **출시 보류(운영 인수 미완료)**

## 범위

- 하객용 청첩장 5종: `simple`, `classic-r`, `romantic`, `gyeol`, `emotional`.
- PC는 크몽 5,000원 주문 후 운영자 제작, Android는 Google Play 5,000원 결제 후 고객 직접 제작. 공통 공개 웹 청첩장 디자인은 동일하며, 웹/앱 편집 UI는 별도.
- 이용 기간 6개월. 기존 티켓·연장 코드 잔존 여부를 포함한 실제 결제·복구·만료 정책 검증은 운영 인수 필수 사항.
- 결제·Firebase 실데이터·고객 권한·공유 URL을 QA 과정에서 임의 수정하지 않는다.

## 자동화 검증: Stage 5에서 완료

- [x] 5종 × 8개 화면 폭 = 40개 반응형 검증. Chrome 에뮬레이션이며 물리 기기 결과가 아님.
- [x] axe WCAG A/AA 검사 10회, 확정 위반 0건. 사진 위 텍스트의 color-contrast 판정 보류는 수동 확인 필요.
- [x] 갤러리의 키보드·Escape·포커스 복귀 5종, 모바일 브라우저 터치 에뮬레이션 5종.
- [x] Stage 5 GitHub PR #37 병합, CI 및 Firebase App Hosting 롤아웃.

## Stage 6 공개 웹 읽기 전용 자동 검사

`scripts/qa-public-wedding-stage6.py` / `.github/workflows/public-wedding-stage6-release-smoke.yml`:

- [ ] 다섯 공개 URL HTTP 200 및 이벤트 콘텐츠·바로가기·섹션 탐색
- [ ] ICS 캘린더 다운로드와 형식·신랑 신부 이름
- [ ] 지도 URL HTTPS·외부 이동 보안 속성, 예식장 연락 및 교통 안내
- [ ] 계좌 복사 UI, 클립보드 상태(실제 계좌 값 로그·자료 저장 금지)
- [ ] 방명록 이름·메시지 필수값 검사 (실제 **등록하지 않음**)
- [ ] 갤러리 전체 목록 진입, 첫/중간/마지막 사진 확대와 닫기
- [ ] 배경음악 켜기·끄기 및 오디오 오류 유무
- [ ] 카카오 공유 페이로드 생성 (실제 Kakao SDK 전송 함수 모의 처리, **전송하지 않음**)
- [ ] 각 테마 전체 화면 캡처 및 검증 매니페스트·GitHub CI/보안·배포 결과

## 운영 배포 차단 항목 (별도 승인 및 실제 기기 필요)

- [ ] Android **실물 기기** 및 iOS **실물 기기**: 탭·스와이프·음악·사진 확대·회전·안전 영역
- [ ] TalkBack/VoiceOver 및 실제 사진 위 텍스트 대비 수동 확인
- [ ] 실제 카카오톡 카드 공유 → 다른 계정에서 수신, 링크/대표 이미지 검수
- [ ] 전화·지도/길찾기·캘린더 앱의 실제 외부 전환
- [ ] Firebase 실계정: 고객과 타인 초대장 읽기·수정 권한, 기한 만료·비공개 차단, 수동 오류 복구
- [ ] Google Play 테스트 구매 5,000원 → 직접제작 → 저장 → 다른 기기 복원/취소 검증
- [ ] PC 크몽 주문 제작·고객 전달 운영 흐름, 안내 문구와 결제 기록
- [ ] 6개월 표시·만료 정책과 사용자에게 제거하기로 약속된 **기간 연장/티켓 기능** 코드·UI 불일치 여부 최종 점검
- [ ] 테스트 콘텐츠 이름 **신민재 요청 ↔ 실제 신민제**, 과거 날짜 **2026-06-20**, 테스트 예식장 전화·지도 좌표 및 갤러리 사진/방명록 데이터 정합성 확인
- [ ] 모든 갤러리 파일의 원본 개별 확대 및 손상 없는 다운로드 (자동 테스트는 일부 표본만 확인)
- [ ] 실제 운영 배포 정책·Google Play Console 공개 범위 최종 승인

**출시 승인 원칙:** GitHub CI 통과나 자동 브라우저 QA만으로 실물 기기·결제·공유를 ‘완료’ 처리하지 않는다. 위 체크리스트에서 제품 출시 필수 항목의 실제 증거가 없으면 **출시 보류**로 표기한다. Android Google Play 프로덕션 또는 크몽 판매 활성화는 이번 QA PR에서 진행하지 않는다.

## 근거

- Stage 5 결과: https://docs.google.com/document/d/1ih6-aMoBMFwRcK1InR6RJvTS_NzppRRtJqlTxyLn4Lw/edit
- Stage 5 배포 후 이미지·QA: https://drive.google.com/file/d/1NZY2YxsO-mOOK04JwlumuKlHMZLgZ3JW/view
- 모바일 실제 계정/결제 QA: https://github.com/hebi10/invitation/issues/30
- 5종 공개 샘플: https://invite.msgnote.kr/shin-minje-kim-hyunji/simple/
