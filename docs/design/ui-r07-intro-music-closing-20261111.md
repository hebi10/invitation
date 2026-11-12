# UI-R07 — 인트로·음악·마무리 화면 통합 리뉴얼

기준: 2026-11-11. 선행 UI-R00~R06 PR #83 → #84 → #85 → #86 → #87 → #88 → #89.

## 적용 코드
- `src/components/sections/WeddingIntro/WeddingIntro.module.css`: Light/Cinema/Envelope 인트로 세 종류에서 최대 폭 480px, 48px 건너뛰기/열기 터치, 안전 영역 및 320px 텍스트 배치, 동작 줄이기 CSS 정리.
- `src/components/media/BackgroundMusic.module.css`: 공개 청첩장의 `invitationAligned` 컨트롤만 48px, 안전 영역, 오류 안내, 키보드 초점 및 동작 줄이기 정리.
- `src/app/_components/WeddingClosing.module.css`: simple/classic-r/romantic/gyeol/emotional 5종 마무리 화면의 배경·간격·글자 크기·320px 레이아웃 정돈. 기존 테마 개성과 사진 및 식물 자산 보존.

## 안전 계약
- 인트로 `WeddingIntro.tsx`의 GSAP 동작/자동 완료 시간/Envelope 열기/건너뛰기, sessionStorage 재노출 정책, 표지로의 전환 로직은 변경하지 않음.
- 음악 `BackgroundMusic.tsx`의 실제 play/pause/자동재생 제한/수동 끄기 우선/볼륨·오류 재시도/포커스 로직은 변경하지 않음.
- 마무리 `WeddingClosing.tsx`의 저장된 이름·날짜·대표 사진 출력, 모든 기존 문구와 조건부 렌더링 보존.
- 다른 테마 vow, 관리/제작 화면, Firestore·Storage·결제·운영 Firebase/Google Play 설정 및 고객 데이터 변경 없음. 새 이미지나 애니메이션을 추가하지 않음.

## QA 인수 게이트
1. 선행 PR #83~#89의 CI/기준선 캡처 확인 및 순차 병합 이후 본 PR 최종 병합.
2. ESLint, TypeScript, 전체 테스트, Next.js production build, CSS Modules 빌드 확인.
3. 인트로 3종×5테마, 화면폭 320/360/390/430/768/1440 및 텍스트 200% 확대, 가로 넘침·노치/안전 영역 확인.
4. Light/Cinema 자동완료, Envelope 열기·건너뛰기, 재진입 세션 정책, `prefers-reduced-motion`, 인트로와 음악 버튼 z-index 우선순위, 키보드/스크린리더 포커스 확인.
5. 실제 음원으로 켜기/끄기·자동재생 차단·다른 앱 인터럽트·재시도·오류 안내, iOS Safari/Android Chrome·인앱 브라우저 확인. 실제 스트리밍 검증은 테스트 더블 결과와 구별.
6. 마무리 5종 이미지 존재·부재, 긴 이름·긴 문장·날짜 존재·부재, 320px 잘림/명도 대비 확인. 표지와 동일한 고객 데이터 출력 보존.
7. 실기기/운영 URL은 별도 인수. 운영 고객 데이터·실결제·실송금 및 SMS 전송 금지.

이 변경은 스타일 코드 수정 및 QA 계획이며 CI 성공·실기기 검증·PR 병합·운영 배포 완료가 아닙니다.
