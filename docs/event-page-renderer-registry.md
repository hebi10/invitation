# 공개 이벤트 페이지 렌더러 레지스트리

## 목적
- 공개 route가 `eventType -> renderer` 기준으로 page/layout/metadata/theme 해석을 선택한다.
- wedding 공개 흐름을 기본 fallback으로 유지하면서, birthday와 general-event는 전용 시각 컴포넌트로 분리한다.

## 기준 파일
- `src/app/_components/eventPageRendererRegistry.tsx`
- `src/app/_components/EventInvitationPage.tsx`
- `src/app/_components/EventInvitationLayout.tsx`
- `src/app/_components/birthday/`
- `src/app/_components/generalEvent/`
- `src/app/[slug]/page.tsx`
- `src/app/[slug]/[theme]/page.tsx`
- `src/app/[slug]/layout.tsx`

## 현재 등록된 renderer
- `wedding`
  - 기존 `EventInvitationPage`, `EventInvitationLayout`, `InvitationThemeKey` 기반 theme/variant 해석 사용
  - `emotional`, `romantic`, `simple` route는 기존 variant availability를 따른다.
- `birthday`
  - `BirthdayInvitationPage`, `BirthdayInvitationLayout`, `birthdayThemes.ts` 사용
  - 지원 route theme: `birthday-minimal`, `birthday-floral`
  - 공개 데이터 로딩, 접근 제한, 이미지 fallback, 음악, 방명록은 기존 공통 상태와 서비스를 사용한다.
- `general-event`
  - `GeneralEventInvitationPage`, `GeneralEventInvitationLayout`, `generalEventThemes.ts` 사용
  - 지원 route theme: `general-event-elegant`, `general-event-vivid`
  - 인트로, 히어로, 인사말, 프로그램, D-Day, 위치, RSVP 자리, 방명록, 푸터를 전용 레이아웃으로 표시한다.

## fallback 정책
- 알 수 없는 event type 또는 renderer가 없는 비활성 타입은 `wedding` renderer로 fallback한다.
- wedding theme route는 기존 variant availability가 없으면 `notFound()` 처리한다.
- birthday theme route는 `birthday-minimal`, `birthday-floral`만 지원하며 다른 값은 `notFound()` 처리한다.
- birthday 기본 slug route는 저장된 wedding default theme과 무관하게 `birthday-minimal`로 해석한다.
- general-event theme route는 `general-event-elegant`, `general-event-vivid`만 지원하며 기본 slug route는 `general-event-elegant`로 해석한다.

## 회귀 기준
- 기존 wedding slug route와 wedding theme route가 그대로 열려야 한다.
- birthday slug route는 wedding 컴포넌트가 아닌 `src/app/_components/birthday/` 렌더러로 열려야 한다.
- `/{birthdaySlug}/birthday-minimal`, `/{birthdaySlug}/birthday-floral`은 열리고, 미지원 birthday 후보 theme는 404가 나야 한다.
- general-event slug route는 wedding 컴포넌트가 아닌 `src/app/_components/generalEvent/` 렌더러로 열려야 한다.
- `/{eventSlug}/general-event-elegant`, `/{eventSlug}/general-event-vivid`은 열리고, 미지원 general-event theme는 404가 나야 한다.

## 다음 단계
1. general-event RSVP 저장 API와 관리자 참석 현황 탭 추가
2. birthday/general-event theme 선택값을 저장 payload에 명시하는 schema 확장 검토
3. eventType별 editor registry 분리
