# UI-07-B — 인트로 3종 모션·표지 연결 리디자인

기준: 2026-11-10 · [UI-07-A-09 인계](https://docs.google.com/document/d/1FkyjbyHSKlVjunBXCtTTyTVcROoywV_MSt2hxLiMvyw/edit) · [구현 PR #69](https://github.com/hebi10/invitation/pull/69)

## 1. 디자인 개선 배경

기존 Light/Cinema에서는 DOM 전체 카피가 580ms 동안 한 번에 나타난 뒤 약 0.4~0.5초 만에 퇴장하기 시작하여 문구가 충분히 읽히지 않았습니다. 또한 초기 카피 opacity:0 상태에서 GSAP dynamic import가 늦어지면 빈 화면처럼 보이는 위험이 있었습니다. Envelope는 열기 시 짧은 카드 상승 외에 버튼 상호작용을 인지할 수 있는 상태 전환이 제한적이었습니다.

기존 세 가지 스타일 키 `none` / `light` / `cinema` / `envelope`와 저장·세션·해시 진입 정책을 그대로 유지하면서, **각 인트로의 메시지가 실제로 읽히는 시간**과 명확한 시작·진행·본문 연결을 개선합니다. 화려한 셔터·3D·그라디언트·그림자는 추가하지 않습니다.

## 2. 화면별 연출 규격

| 스타일 | 순서 | 시점 | 화면과 움직임 |
| --- | --- | --- | --- |
| Light · 타이포그래피형 | 선→호칭→이름→초대 문구→날짜→본문 | 0.06/0.18/0.36/0.69/0.90초부터 등장, 2.4초 종료 | 아이보리 종이 위 글자만 최대 12px 상승하며 부드럽게 들어오고 나중에 함께 페이드 |
| Cinema · 웨딩 화보형 | 사진→WEDDING DAY→이름→날짜→본문 | 0/0.30/0.55/0.89초부터 등장, 2.8초 종료 | 기존 대표 사진의 object-position을 유지한 채 약 3.5% 미세 확대, 텍스트 순차 등장 |
| Envelope · 편지형 | 편지 표시→버튼 탭→카드 상승→본문 | 탭 전 유지, 탭 후 약 1.1초 | 종이 카드 전체 1px 경계와 정보 표시, 탭 후 최대 12px 상승·페이드 |

초기 CSS 모션은 동적으로 불러오는 GSAP의 준비를 기다리지 않습니다. GSAP은 정상 로드 시 자동형의 종료 페이드 및 편지형 클릭 전환을 담당합니다. GSAP 불러오기 실패 시에도 CSS 연출과 안전한 자동 완료 타이머가 유지되어 본문 진입이 막히지 않도록 합니다.

## 3. 수정 파일과 비수정 영역

- `src/components/sections/WeddingIntro/WeddingIntro.tsx`: 데이터 선택자, GSAP 완료 시점, 비동기 실패 폴백, 편지 버튼 열기 상태.
- `src/components/sections/WeddingIntro/WeddingIntro.module.css`: 3종 장면별 단계별 keyframes, reduced-motion, 짧은 화면 높이의 편지 인트로 스크롤 처리.
- `src/components/sections/WeddingIntro/QuietInvitationTokens.module.css`: Light/Cinema 읽기 시간을 2.4/2.8초로 규격 정리.
- `scripts/test-quiet-invitation-tokens.mts`: 새 읽기 시간 검증.
- `scripts/qa-wedding-ui07-b.py` 및 `.github/workflows/invitation-ui07-b-intro-qa.yml`: 실제 Chromium 미리보기·중간 화면·종료·reduced-motion 검증.

UI-07-A의 섹션 토큰/순서, `WeddingBase`의 연락·캘린더·지도·방명록·계좌, `EventInvitationPage`의 부모 연결, 사용자 사진의 저장·객체 URL·Firebase·결제/권한/Google Play는 변경하지 않습니다. CSS keyframes와 기존 GSAP 외의 신규 의존성은 추가하지 않습니다.

## 4. QA 및 접근성 계약

- Light/Cinema는 충분한 본문 읽기 프레임이 남아야 하고, 이미지와 텍스트가 동시에 갑자기 사라져서는 안 됩니다. 두 유형은 자동 진행이지만 48px 이상의 건너뛰기를 보존합니다.
- Envelope는 클릭 전 **자동 종료 없음**, 클릭 후 버튼 disabled 및 화면 상태 변화가 있어야 합니다. GSAP 로딩 실패·상태 변경·반복 클릭에서 완료 콜백이 중복되지 않아야 합니다.
- `prefers-reduced-motion: reduce`에서는 모든 CSS 애니메이션을 제거하고 Light/Cinema는 자동 완료, Envelope는 클릭하기 전까지 정지 상태를 유지합니다.
- 전환 완료 후 `[data-wedding-intro]`와 pending 오버레이가 사라지고 body 스크롤 잠금·표지 가림이 없어야 합니다. 해시 딥링크, 세션 재진입, ESC/건너뛰기, 초기 사진 오류 시도도 검증합니다.
- Chromium QA는 3종 × 320/390/1440px 및 390px reduced-motion: 12환경으로 동작을 확인합니다. 실기기 Android/iOS 및 TalkBack/VoiceOver는 자동 테스트 성공으로 대체하지 않습니다.
- 변경 전의 1.4/1.6초 규격이 다른 문서·과거 QA에 남아 있을 수 있으므로 신설 B 인수 문서를 2.4/2.8초의 기준으로 사용합니다.

## 5. GitHub 검증·배포 경계

현재 작업 브랜치: `feat/ui-07-b-intro-animation-20261110`, base: `docs/ui-07-a09-interface-handoff-20261110`.
코드 PR: https://github.com/hebi10/invitation/pull/69
CI: https://github.com/hebi10/invitation/actions/runs/42792844465
브라우저 모션 QA: https://github.com/hebi10/invitation/actions/runs/42792844636

최종 CI, 브라우저 QA 및 교차 회귀 결과가 확인되기 전 `main` 병합 및 Firebase/App Hosting 운영 배포는 수행하지 않습니다. 모바일·PC 편집기에 표시되는 동일 공개 웹 인트로는 이 공통 코드를 기준으로 후속 검증합니다.
