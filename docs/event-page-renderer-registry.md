# 공개 이벤트 페이지 렌더러 레지스트리

## 목적
- 공개 페이지 route가 `wedding` 전용 컴포넌트를 직접 고르지 않고, `eventType -> renderer` 기준으로 진입하게 만든다.
- 현재는 `wedding`, `birthday`가 실제 renderer로 연결돼 있고, 이후 `seventieth`, `etc`를 추가할 자리를 확보한다.

## 기준 파일
- `src/app/_components/eventPageRendererRegistry.tsx`
- `src/app/_components/EventInvitationPage.tsx`
- `src/app/_components/EventInvitationLayout.tsx`
- `src/app/_components/eventPageThemes.ts`
- `src/app/_components/eventPageState.tsx`

## 현재 구조
### 레지스트리
- `resolveEventPageRenderer(eventType)`
  - 입력된 `eventType`을 `normalizeEventTypeKey`로 정규화
  - 해당 타입의 renderer가 있고 `enabled === true`면 그대로 사용
  - 없거나 비활성 타입이면 `wedding` renderer로 fallback

### 현재 등록된 renderer
- `wedding`
  - 공개 route page
  - layout
  - metadata
  - theme 해석
  - variant URL 해석
- `birthday`
  - 현재는 wedding 공개 route/page/layout/theme 해석을 그대로 재사용하는 PoC renderer
  - birthday slug도 `eventType -> renderer` 레지스트리를 통해 fallback 없이 직접 매핑됨

## fallback 정책
- 잘못된 event type
  - `normalizeEventTypeKey(..., DEFAULT_EVENT_TYPE)`로 `wedding` 기준 fallback
- 등록은 돼 있지만 아직 비활성 타입
  - 현재는 `wedding` renderer로 fallback
- theme가 없거나 해당 variant가 비활성
  - `resolveRouteTheme(...)`가 `null`을 반환하고 route에서 `notFound()` 처리

## route 적용 위치
- `src/app/[slug]/page.tsx`
  - slug 기준 eventType 조회 후 renderer 선택
- `src/app/[slug]/[theme]/page.tsx`
  - theme route 진입 시 renderer별 theme 지원 여부 확인
- `src/app/[slug]/layout.tsx`
  - layout / metadata도 renderer registry 기준으로 분기

## wedding 네이밍 정리 원칙
- 새 generic 파일 추가
  - `EventInvitationPage.tsx`
  - `EventInvitationLayout.tsx`
  - `eventPageThemes.ts`
  - `eventPageState.tsx`
- 기존 wedding 파일은 compatibility export로 유지
  - `WeddingInvitationPage.tsx`
  - `WeddingInvitationLayout.tsx`
- 즉, 공개 route 진입부는 더 이상 wedding 이름에 직접 묶이지 않고, 내부 구현은 기존 wedding 흐름을 재사용한다.

## 회귀 기준
- 기존 wedding slug route는 그대로 열려야 한다.
- 기존 theme route(`/[slug]/[theme]`)는 그대로 동작해야 한다.
- `DEFAULT_INVITATION_THEME`, variant availability, 공개/비공개 판정은 기존 wedding 로직을 그대로 따른다.

## 다음 단계
1. `birthday` 전용 theme renderer와 메타 문구 분리
2. `eventType -> editor` registry 추가
3. `seventieth`, `etc` renderer 추가
4. `weddingPageState`, `weddingThemes` 내부 구현도 단계적으로 generic 이름으로 정리
