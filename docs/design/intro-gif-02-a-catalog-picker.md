# INTRO-GIF-02-A — 고객 선택형 인트로 카탈로그·공통 UI 기반

상태: 구현 PR(승인 전 Draft). 기준: 고객이 약 10개의 GIF 중 **직접 보고 한 개 선택** 또는 **사용 안 함**; 특정 청첩장 디자인/상품 등급에 귀속되지 않음.

## 실제 구현
- `src/lib/invitationIntroCatalog.ts`: 단일 ID 카탈로그. `id/label/description/gifSrc/posterSrc/durationMs/sha256/active/sortOrder`. `getInvitationIntroPreset`, `listAvailableInvitationIntroPresets`, `parseInvitationIntroChoice`.
- 현재 **실제 바이너리가 검증된 intro-01 한 종류만 등록**. 확장 대상 약 9개는 미제작이므로 UI에 노출하지 않음. 소스 자산은 선행 [PR #100](https://github.com/hebi10/invitation/pull/100)의 480×600, 2,000ms GIF 및 WebP 포스터.
- `src/components/sections/InvitationIntro/InvitationIntroPicker.tsx`: 공통 React 컴포넌트. `value`, `onChange`, 선택적인 `savedValue`, `disabled`만 받음. **고객 데이터 저장/외부 API 호출은 컴포넌트에서 실행하지 않음**.
- native fieldset/radio 구조: 기본값 선택하지 않음(`value=null`), 명시적 `none` 선택 가능, 실제 GIF 1종 표시, 현재 적용/미저장 변경 구분.
- 카드 목록에는 WebP 정지 포스터만 로드. 미리보기 버튼을 클릭했을 때 **해당 GIF 한 개만** 표시하고, 다시 보기/닫기(Escape)/초점 복귀 가능. 모션 감소 설정은 포스터만 표시하며 GIF 네트워크 요청하지 않음. GIF 로딩 실패 시 정지 포스터 표시.
- CSS는 중성 회색·흰색, 전체 테두리와 간격 위주, 그림자/그라데이션/임의 애니메이션 없음. 모바일 2열·넓은 화면 3열, 320px 검증.
- `src/app/intro-catalog-preview/`는 실제 브라우저 테스트용 **개발 모드 전용 경로**. 프로덕션 빌드에서는 `notFound()`로 404, 검색엔진 noindex 설정. 임시 선택값은 React state에만 저장되고 새로고침 시 초기화됨.

## 검증
- `scripts/test-invitation-intro-catalog.mts`: 1종 실제 등록/미제작 미노출, 이벤트 타입 독립, 레거시 `introStyle` 불변, `none`/미선택 구분, WebP만 서버 렌더링, GIF/포스터 실제 SHA-256 manifest 일치.
- `scripts/run-test-suite.mjs`의 core/client-rendering 테스트 목록에 등록. 기존 전체 Lint·TypeScript·Next build 및 Android 보안 테스트 유지.
- `scripts/qa-invitation-intro-gif-02a.py` + `.github/workflows/invitation-intro-gif-02a-qa.yml`: 320/390/768/1440px 브라우저 선택/미리보기/ESC 초점·다시 보기·선택 후 새로고침 미저장, reduced motion, 네트워크 오류 폴백 6가지 상황, PNG·SHA256 증빙.

## 다음 작업과 비변경 범위
- `INTRO-GIF-02-B`: PC 제작기/이벤트별 편집에 이 컴포넌트를 **실제 연결하고**, 별도 `introPresetId` 저장·취소·재조회 구축. 현재 `IntroSettings`를 바로 교체하지 않음.
- `INTRO-GIF-02-C`: Android 설정의 동일 카탈로그·저장 ID·웹 기반 미리보기 연결, 구버전 호환.
- `INTRO-GIF-02-D`: 고객 저장 GIF ID만 공개 초대장에서 표시, 이벤트 타입별 독립 인트로와 중복 표시 해소.
- `INTRO-GIF-03`: 나머지 실제 GIF 약 9종 제작 및 catalog 등록.
- 기존 `none/light/cinema/envelope` 읽기·저장 정책, Firebase/Firestore 데이터, 고객·구매·결제, 공개 초대장, 운영 App Hosting/Google Play는 **변경하지 않음**.
- 이 단계의 GIF 재생 시간(2초)은 공개 페이지 본문 자동 진입을 강제하는 정책이 아님.
