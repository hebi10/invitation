# birthday 이벤트 타입 운영 반영

## 1) 적용 범위
- `birthday`는 wedding renderer를 재사용하던 PoC에서 벗어나 생일 전용 공개 renderer, wizard 문구, 관리자 필터를 사용한다.
- 저장소, 공개/비공개 판정, 이미지 업로드, 방명록, 음악, 노출 기간은 기존 이벤트 공통 인프라를 그대로 사용한다.
- 1차 공개 생일 테마는 `birthday-minimal`, `birthday-floral`이다. `birthday-luxury`, `birthday-y2k`, `birthday-aurora`, `birthday-paper`는 후속 확장 후보로만 문서화한다.

## 2) 코드 기준
- 이벤트 메타: `src/lib/eventTypes.ts`
  - `EVENT_TYPE_META.birthday.enabled = true`
  - 관리자 라벨은 `생일`, 고객 라벨은 `내 생일 초대장`
- 공개 렌더러: `src/app/_components/eventPageRendererRegistry.tsx`
  - `birthday`는 `src/app/_components/birthday/` 전용 page/layout/theme registry로 연결
  - `/slug/birthday-minimal`, `/slug/birthday-floral` route를 지원
- wizard: `src/app/page-wizard/pageWizardData.ts`, `PageWizardClient.tsx`
  - `birthday-page-wizard`는 기존 저장 타입을 유지하되 입력 문구를 `생일 주인공`, `파티 일정과 장소`, `초대 문구` 기준으로 분리
  - 생일 주인공 이름은 기존 `couple.groom.name`, `groomName`, `displayName`, `pageData.greetingAuthor`에 매핑
  - `/page-wizard?eventType=birthday`는 `pageWizardPresentation`과 `BirthdayThemeStep`으로 생일 전용 로딩/로그인 문구, 화면 톤, 디자인 선택 UI를 사용
- 관리자: `src/app/admin/AdminPageClient.tsx`
  - `pageCategory=birthday`일 때 `eventType === 'birthday'` 페이지와 댓글만 표시
  - 이미지/노출 기간 탭은 eventType 필터를 전달받아 생일 페이지 범위로 제한

## 3) 데이터 매핑
- 생일 주인공 이름: `displayName`, `metadata.title`, `couple.groom.name`, `pageData.greetingAuthor`
- 날짜/시간: 기존 `weddingDateTime`
- 장소명: `venue`, `pageData.venueName`
- 주소: `pageData.ceremonyAddress`
- 지도: `pageData.kakaoMap`, `pageData.mapUrl`
- 초대 문구: `pageData.greetingMessage`
- 갤러리: `pageData.galleryImages`
- 방명록: 기존 `events/{eventId}/comments` 흐름
- 기본 생일 디자인: `pageData.birthdayTheme`
  - 공개 가능한 값은 `birthday-minimal`, `birthday-floral`
  - 기본 route는 저장값을 우선 사용하고, `/slug/birthday-minimal`, `/slug/birthday-floral` 명시 route는 해당 theme를 사용

## 4) 검증 기준
- `node --experimental-strip-types --loader ./scripts/ts-path-loader.mjs scripts/test-birthday-event-rendering.mts`
- `npm run typecheck:web`
- `npm run lint:web`
- 수동 QA: `/page-wizard?eventType=birthday`, `/birthday-slug`, `/birthday-slug/birthday-minimal`, `/birthday-slug/birthday-floral`, `/admin?section=events&pageCategory=birthday&tab=pages`
