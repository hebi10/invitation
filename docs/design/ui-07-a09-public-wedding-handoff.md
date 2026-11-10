# UI-07-A-09 — 공개 청첩장 후속 UI 인터페이스 인계

검토일: 2026-11-10. 기준 저장소: hebi10/invitation. **본 단계는 코드·디자인 계약과 QA 인계이며 운영 UI, 고객 데이터, 배포를 수정하지 않습니다.**

## 1. 선행 작업과 기준

- A-06 [PR #65](https://github.com/hebi10/invitation/pull/65): WeddingBase 섹션 요약·접힘/간격·테마별 교통/계좌 그룹 구현.
- A-07 [PR #66](https://github.com/hebi10/invitation/pull/66): 5종·조건부 상태·200% 확대 포함 [60/60 브라우저 검증](https://github.com/hebi10/invitation/actions/runs/42785909453). 키보드 30회와 갤러리 모달 5회 통과. 물리 기기 TalkBack/VoiceOver 검증은 포함되지 않습니다.
- A-08 [PR #67](https://github.com/hebi10/invitation/pull/67): **같은 개발용 가상 데이터**로 A-06 이전과 A-07 최종을 비교해 [10/10환경·40쌍](https://github.com/hebi10/invitation/actions/runs/42788017266) 전후 자료 확보. 390/1440px에서 페이지 길이 +65.7~75.4px, 가로 넘침 0. [비교 이미지](https://drive.google.com/file/d/1WlkFpt3TO7VeyKP7J_pjwXG7hTYRTymm/view) / [ZIP](https://drive.google.com/file/d/14ce0jgzUMbtWonlcRjqFclhdmDVZO3p2/view).
- 운영 샘플과 가상 샘플은 **서로 다른 데이터**이므로 동일 픽셀 합격 근거로 사용하지 않습니다. 자동 UI 검증 성공은 사용자 디자인 승인이나 실기기 검증 완료를 의미하지 않습니다.

## 2. 구조 보존 계약

기본 문서 소유자: \`src/app/_components/public-invitations/wedding/WeddingBase.tsx\`, \`WeddingBase.module.css\`.
본문 흐름은 **표지 → 바로가기 → 초대의 글 → 가족 연락 → 갤러리 → 예식 안내 → 오시는 길/지도 → 교통·방문 안내 → 마음 전하실 곳 → 축하의 마음 → 하단 바로가기**입니다. 조건부 데이터가 없으면 빈 섹션을 만들지 않습니다.

- 앵커: \`#wedding-info\`, \`#wedding-location\`, \`#wedding-gallery\`, \`#wedding-accounts\`를 유지하고 링크 변경 시 참조를 동시에 갱신합니다.
- \`data-wedding-section\`: \`invitation\`·\`contact\`·\`gallery\`·\`ceremony\`·\`schedule\`·\`transport\`·\`gift\`·\`guestbook\`. HTML 태그는 동일하지 않습니다(연락은 details, 교통은 section, 계좌·방명록은 wrapper div).
- 공통 스타일: \`--ui07-section-gap\`, \`--ui07-summary-min-height: 48px\`, \`--ui07-details-content-gap: 16px\`, \`--ui07-action-gap\`, \`--ui07-panel-padding-inline: 20px\`(359px 이하 16px), \`--ui07-panel-border\`. 모든 테마에 전역 강제하지 않습니다.
- 아코디언: native \`details/summary\` 및 \`:focus-visible\`, Tab·Shift+Tab·Enter·Space, 닫힌 상태의 개인정보/계좌/방명록 폼 비노출을 유지합니다.
- 하단: transport는 실제 저장 정보 설명+paper-soft 패널; gift는 양측 계좌 **1개 전체 테두리 그룹**, \`gyeol\`만 전체 테두리를 대신하는 종이 표면; guestbook은 독립 여백·기존 작성 CTA입니다. 똑같은 구분선·카드를 세 섹션에 반복하지 않습니다.
- 테마별 개성: \`simple\` 아이보리, \`classic-r\` 번호형, \`romantic\` 사진/명조, \`gyeol\` 전통 프레임, \`emotional\` 연녹색/콜라주. 기존 대표 이미지와 폰트/번호/프레임의 비율은 유지합니다.

## 3. UI-07-B — 인트로·본문 진입

**실제 연결 파일:** \`src/app/_components/EventInvitationPage.tsx\`, \`src/components/sections/WeddingIntro/WeddingIntro.tsx\`, \`src/app/_components/public-invitations/wedding/WeddingCover.tsx\`, \`useImmediateWeddingPageReveal.ts\`, \`useWeddingMotion.ts\`.

- EventInvitationPage는 \`ThemeRenderer\`·\`WeddingIntro\`·\`BackgroundMusic\`를 본문 내부로 섞지 않고 각각 렌더링합니다. 인트로는 dialog+세션 재방문 정책+건너뛰기/완료+스크롤 잠금 복구의 소유자입니다.
- cinema 인트로는 \`[data-intro-photo]\`와 \`[data-wedding-cover-photo]\` 초점 위치를 연결합니다. 변경 시 대표 사진 object-position을 보존하고 인트로 종료 후 표지와 \`quickLinks\`로 자연스럽게 진입합니다.
- A의 섹션 여백/토큰은 변경하지 않습니다. reduced-motion, 인트로 재방문·해시 진입·건너뛰기·모달 포커스 및 스크롤 복구를 테스트합니다.
- **B의 실무 인수 조건:** 모바일 320/390/430, 태블릿 768, PC 1440에서 인트로 닫힘 직후 표지 노출과 본문 링크 활성, 대표 사진 초점·스크롤 위치·키보드 탐색 정상.

## 4. UI-07-C — 가족 연락·달력 동작

**연결 파일:** \`WeddingBase.tsx\`, \`WeddingCalendarDownload.tsx\`, \`src/app/_components/public-invitations/shared/PublicInvitationDateFeature.tsx\`.

- 연락: \`contacts.length > 0\`일 때만 \`details\` 렌더링; \`contactSummary\`는 실제 연락 가능한 신랑측·신부측만 소개. 상세에는 이름 및 전화/SMS 버튼. 없는 측을 고정 문구로 표시하거나 요약에 전화번호 노출 금지.
- 달력: **캘린더에 저장** 버튼은 \`wedding.ics\` 다운로드, **예식 달력 보기**는 \`features.showCountdown\`에 의해 표시되는 \`details\` 안 \`PublicInvitationDateFeature(mode="calendar-countdown")\`. 동작을 혼합하거나 데이터/타임존 계약 변경 금지.
- **C 인수 조건:** 양측/신랑측만/신부측만/없음/긴 문구 상태, 기본 닫힘, 48px summary, 키보드 접근, .ics 내용과 한국 시간대 확인. 실제 전화·문자 및 OS 캘린더 호출은 실기기에서 별도 검증.

## 5. UI-07-D — 지도·길찾기

**연결 파일:** \`WeddingBase.tsx\`, \`src/app/_components/public-invitations/wedding/gyeol/LocationMap.tsx\` 및 CSS.

- \`showMap && storedContent.mapHref\` 조건을 유지하며 props \`appearance\`, \`address\`, \`venueName\`, \`kakaoMapConfig\`, \`mapHref\`를 보존합니다. \`gyeol/\` 경로의 지도는 실제로 5종 테마 모두에서 \`appearance\`에 따라 사용됩니다.
- \`schedule\`(오시는 길) 내 지도 배치 유지. 새 지도 비율/컨트롤/길찾기 아이콘은 D에서만 변경하며, 교통·방문 안내 \`transport\`의 배경/경계 규칙과 혼동하지 않습니다.
- 로딩·좌표 오류·SDK 실패 시 \`지도에서 위치 보기\` 폴백이 남아야 합니다. 확대·이동 토글은 기존 \`aria-pressed\`를 보존합니다. SDK 도메인/CSP 변경은 별도 연동 검증 대상으로 기록합니다.
- **D 인수 조건:** 실제 지도 SDK 정상/오류·네트워크 오프라인·외부 길찾기, 손가락 스크롤·지도 확대, 320px 가로 넘침·컨트롤 터치·키보드. 기존 가상 \`showMap=false\` QA는 지도 동작 검증으로 계산하지 않습니다.

## 6. UI-07-E — 음악 아이콘·위치

**연결 파일:** \`src/app/_components/EventInvitationPage.tsx\`, \`src/components/media/BackgroundMusic.tsx\` 및 \`BackgroundMusic.module.css\`.

- 현재 \`alignToInvitation\`으로 PC 480px 캔버스 오른쪽 위에 고정됩니다. 모바일은 \`safe-area-inset-top/right\`을 고려합니다. 음악 z-index는 30, 인트로 오버레이는 12000입니다.
- 아이콘 교체는 E에서 수행. 임시 \`Ⅱ\`/\`♪\`을 교체하더라도 버튼의 \`aria-label\`(음악 켜기/끄기/재시도), \`aria-pressed\`, 사용자의 수동 선택 우선, 자동재생 제한·재시도·포커스 복귀를 유지합니다. 새 음악 버튼이 인트로·갤러리 팝업 위를 덮지 않게 확인합니다.
- **E 인수 조건:** 음악 없음/로드 실패/자동재생 차단/연속 켜기·끄기, 에러 안내 닫기, 모바일 노치·상태바/PC 중앙 480px 정렬, 본문 \`quickLinks\`와 겹침 0.

## 7. UI-07-F — 전 범위 QA 및 운영 인수

- 코드: \`npm run check\`, \`npm test\`, \`npm run build\`, Firebase Firestore/Storage emulator, A06/A07/A08 및 P1/P2 회귀 재확인.
- 시각: 5테마 × 320/390/430/768/1440, CSS/텍스트 200% 확대, 단측·양측·없음·장문; 전후 동일 가상 데이터 PNG, SHA256 manifest, 섹션 높이/정렬/가로 넘침.
- 동작: 인트로·갤러리 Escape/포커스, 전화/SMS, .ics·인라인 달력, 실제 지도 SDK/외부 앱, 계좌 복사, 방명록 상태·입력, 음악 상태/접근성, 하단 링크 및 공유.
- 실기기: Android/iOS 각각 시스템 글자 200%, TalkBack/VoiceOver, safe-area·터치, 외부 앱 동작. 결제·실제 방명록 제출은 별도 승인·테스트 환경 및 고객 데이터 보호 조건을 준수합니다.
- 자동 브라우저 통과 ≠ 실제 단말/운영 검증 완료. CI 통과 ≠ main 병합/운영 Firebase 배포 완료.

## 8. PR 순서·범위 및 완료 기준

브랜치 관계: **#65 (A-06 → main)** → **#66 (A-07 → A-06)** → **#67 (A-08 → A-07)** → **A-09(본 문서·계약 QA → A-08)**. 실제 병합 전 각 PR의 base/diff를 다시 확인해 순서대로 조정해야 합니다.

A-09 범위는 문서·검증 스크립트에 한정하며 기존 사용자-facing 웹/Android UI, CSS, Firebase, 가격/6개월 정책, 결제, 스키마와 고객 파일을 변경하지 않습니다. 이번 단계에서 main 병합과 운영 배포를 수행하지 않습니다.

A-09 완료 기준: 이 인계 문서와 검증 스크립트가 GitHub에 커밋되고 CI 통과하며 Drive의 Invitation \`03_상세작업_명령어_및_단계\` 폴더에 인계 기록을 남기는 것. 실기기/운영 인수는 아직 보류입니다.

**후속 작업 권장 순서:** UI-07-B 인트로 → UI-07-C 가족 연락·달력 → UI-07-D 지도 → UI-07-E 음악 → UI-07-F 통합 QA.

기획·증거: [전체 A단계 계획](https://docs.google.com/document/d/155ytrxZF-EO2l66hUIUWKUYPU0bnaOVSVAlXXWhi7FM/edit) / [A-07 검증 문서](https://docs.google.com/document/d/170fphHvP3ivviy6dAktc_cLd76uou1Kmy6M8r1KSSmE/edit) / [A-08 인수 문서](https://docs.google.com/document/d/1s5RUglCEVDcW873oFQC8F-u-cJLbvcVmjyirmPBwn-M/edit).
