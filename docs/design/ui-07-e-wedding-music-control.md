# UI-07-E — 음악 아이콘·위치 UI 리디자인

2026-11-11 · GitHub: [PR #72](https://github.com/hebi10/invitation/pull/72) (Draft) · 누적 기준: UI-07-D [PR #71](https://github.com/hebi10/invitation/pull/71)
기존 A/B/C는 `main`에 병합되어 있으나, D/E는 아직 운영 반영하지 않았습니다.

## 1. 현행 문제
- 기존 웨딩 음악 버튼의 **`♪`(끄기 전) / `Ⅱ`(재생 중)** 문자 표시가 온·오프 상태를 직관적으로 표현하지 못함.
- 44px 컨트롤과 원형 버튼으로 다른 섹션의 단정한 평면 디자인과 시각적 불일치.
- 769px 이상 PC는 480px 청첩장 우측 가장자리 기준 정렬하지만, 768px 태블릿은 화면 오른쪽으로 벗어날 수 있음.
- 모바일 노치/안전 영역에서 추가 여백이 부족할 수 있음.
- 기존 오류 재시도와 접근성 상태·오디오 재생 함수는 보존해야 함.

## 2. UI 수정
- `alignToInvitation=true`인 웨딩 공개 청첩장에만 새 SVG 상태 아이콘 사용: **음악 켜기 전=슬래시 스피커**, **음악 재생 중=음파 스피커**, **오류=재시도 화살표**. 보조 장식, 그림자·그라디언트 없이 한 가지 선형 두께를 사용.
- 버튼 크기 **48×48px**, 정사각형, 중립 회색 1px 전체 테두리. 꺼짐·오류는 흰색 바탕/검정 아이콘, 켜짐은 차콜 바탕/흰색 아이콘으로 상태 구분.
- `aria-pressed`, 기존 `aria-label`과 `title`(음악 켜기/끄기/다시 시도)은 유지. SVG는 장식이므로 `aria-hidden=true`와 포커스 불가.
- 모바일 상단은 `safe-area-inset-top + 12px`, 우측은 `safe-area-inset-right + 12px`을 고려; 태블릿/PC는 실제 청첩장 중앙 **480px 컨테이너 오른쪽 안쪽 12~16px**에 정렬.
- 버튼 포커스는 2px 검정 외곽선. 웨딩 안내 힌트만 펄스·그림자를 제거해 시각적 방해 축소. 인트로·갤러리 모달과의 z-index 계약은 변경하지 않음.

## 3. 비변경 계약
- `BackgroundMusic.tsx`의 사용자 수동 재생 우선, 브라우저 자동재생 거부 응답, 미디어 로딩 실패 재시도, `onRetryLoad`, 음량/볼륨 제한, 오류 메시지 닫기 후 포커스 복귀, 중복 재생 방지 및 세션 상태는 수정하지 않음.
- `EventInvitationPage.tsx`의 음악 표시 조건·음원 선택·Google Play/Firebase/계좌/결제·고객 콘텐츠는 변경하지 않음.
- 생일/돌잔치 등 `alignToInvitation`을 쓰지 않는 행사 컴포넌트에는 기존 ♪/Ⅱ 표시와 버튼 배치 유지.
- 추가 패키지 설치·새 음원 파일 생성·사용자 업로드 음악 변환 없음.

## 4. 검증 범위
- 새 `scripts/test-wedding-ui07-e.mts`: 아이콘 3상태, 웨딩 전용 CSS, 48px, 480px/안전 영역, 기존 상태/오류 함수 계약.
- 새 `scripts/qa-invitation-ui07-e.py`: 실제 Next.js 샘플의 React `BackgroundMusic`을 Chromium에서 확인. **5테마×320/390/430/768/1440px=25 사례** + 390px 오류/재시도 5건 + 390px 글자 200% 5건, 총 **35개 브라우저 사례** 계획.
- Chromium에서는 실제 음원 스트리밍 대신 브라우저에서 `play()/pause()`만 테스트 더블로 대체. 아이콘 상태·접근성 이름·재생 전환·오류 닫기 후 포커스·재시도, PC/태블릿 480px 컨테이너 정렬, 모바일 safe-area 인접 여백, 스크롤 고정, 가로 넘침을 확인.
- 실제 오디오 리소스의 음질/OS 오디오 포커스·Android/iOS 실기기 시스템 글꼴·TalkBack/VoiceOver는 별도 수동 QA 범위. 관련 기존 P1 청첩장/음악·A-06/07 등 CI 회귀도 확인.
- QA 워크플로: `.github/workflows/invitation-ui07-e-music-qa.yml`.
- PR: https://github.com/hebi10/invitation/pull/72
- 전용 QA 실행: https://github.com/hebi10/invitation/actions/runs/42940385224
- 전체 CI 실행: https://github.com/hebi10/invitation/actions/runs/42940384853

## 5. 병합·배포
이번 작업 브랜치는 `feat/ui-07-e-music-control-20261111`; base는 D의 `feat/ui-07-d-map-route-controls-20261111`입니다. 해당 PR은 Draft로 유지하고, CI 및 화면 검증 전 `main` 병합이나 Firebase App Hosting/Google Play 운영 배포를 하지 않습니다. B/C에 영향을 주는 전역 스타일 변경도 하지 않습니다.
